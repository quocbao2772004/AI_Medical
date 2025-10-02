#!/usr/bin/env python3
"""
Script inference cho mô hình X-ray2CTPA
Chuyển đổi ảnh X-ray 2D thành CTPA 3D với xử lý GIỐNG HỆT TRAINING CODE GỐC
*** CẬP NHẬT: GIỮ NGUYÊN CODE 532 DÒNG GỐC, THÊM 2 GÓC NHÌN VỚI CHẤT LƯỢNG CAO TƯƠNG TỰ ***
"""

import os
import sys
import torch
import numpy as np
from pathlib import Path
import argparse
from PIL import Image
import cv2
from typing import Optional, Union, Tuple
import warnings
warnings.filterwarnings('ignore')

# Import các module cần thiết
from ddpm import Unet3D, GaussianDiffusion
from ddpm.unet import UNet
import SimpleITK as sitk
from diffusers import AutoencoderKL
from torchvision import transforms as T

# Thêm constants từ training code - GIỐNG HỆT LIDC DATASET (vì config dùng name_dataset: LIDC)
CONTRAST_HU_MIN = -1200.0  # Từ preprocess/preprocess_lidc.py line 22
CONTRAST_HU_MAX = 600.0    # Từ preprocess/preprocess_lidc.py line 23

# --- TOÀN BỘ CÁC HÀM TỪ SCRIPT GỐC CỦA BẠN (532 DÒNG) ĐƯỢC GIỮ NGUYÊN ---

def video_tensor_to_gif(tensor, path, duration=120, loop=0, optimize=True):
    """
    HÀM GỐC TỪ SCRIPT CỦA BẠN.
    Convert tensor thành GIF animation GIỐNG HỆT REPO GỐC
    Sử dụng normalization GIỐNG HỆT ddpm/diffusion.py line 1200
    """
    # Normalize GIỐNG HỆT repo gốc: tensor.min() -> tensor.max() thành 0->1
    min_val = tensor.min()
    max_val = tensor.max()
    tensor = ((tensor - min_val) / (max_val - min_val + 1e-8)) * 1.0
    
    # Chuyển thành PIL images
    images = map(T.ToPILImage(), tensor.unbind(dim=1))
    first_img, *rest_imgs = images
    first_img.save(path, save_all=True, append_images=rest_imgs,
                   duration=duration, loop=loop, optimize=optimize)
    return images

def denormalize_ctpa_volume(volume, dataset_min, dataset_max):
    """
    HÀM GỐC TỪ SCRIPT CỦA BẠN.
    Denormalize CTPA volume từ latent space về HU values thực tế
    """
    volume_01 = (volume + 1.0) / 2.0
    volume_denorm = volume_01 * (dataset_max - dataset_min) + dataset_min
    volume_hu = volume_denorm * (CONTRAST_HU_MAX - CONTRAST_HU_MIN) + CONTRAST_HU_MIN
    volume_hu = np.clip(volume_hu, CONTRAST_HU_MIN, CONTRAST_HU_MAX)
    return volume_hu.astype(np.float32)

def denormalize_for_display(volume):
    """
    HÀM GỐC TỪ SCRIPT CỦA BẠN.
    Denormalize volume để hiển thị.
    """
    if volume.min() >= -1.1 and volume.max() <= 1.1:
        volume_display = (volume + 1.0) / 2.0
    elif volume.min() >= -0.1 and volume.max() <= 1.1:
        volume_display = volume
    else:
        volume_display = (volume - volume.min()) / (volume.max() - volume.min() + 1e-8)
    return np.clip(volume_display, 0.0, 1.0)

def apply_medical_orientation(volume, use_training_transpose=False):
    """
    HÀM GỐC TỪ SCRIPT CỦA BẠN.
    Áp dụng orientation GIỐNG FILE generated_ctpa_none (KHÔNG TRANSPOSE)
    """
    if len(volume.shape) == 3:
        d, h, w = volume.shape
        # print(f"🔍 Input volume shape: (D={d}, H={h}, W={w})") # Giảm bớt log
        if use_training_transpose:
            volume_oriented = volume.transpose(2, 1, 0)
            # print(f"📊 Training transpose: {volume.shape} → {volume_oriented.shape}")
        else:
            volume_oriented = volume
            # print(f"📊 No transpose: keeping original shape {volume.shape}")
        return volume_oriented
    return volume

def create_medical_nifti(volume, spacing=(1.0, 1.0, 1.0)):
    """
    HÀM GỐC TỪ SCRIPT CỦA BẠN.
    Tạo NIfTI image với metadata chuẩn medical imaging GIỐNG TRAINING CODE
    """
    nifti_image = sitk.GetImageFromArray(volume.astype(np.float32))
    nifti_image.SetSpacing(spacing)
    nifti_image.SetOrigin([0.0, 0.0, 0.0])
    nifti_image.SetDirection([1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0])
    return nifti_image

def _apply_medical_windowing(self, image: np.ndarray, center: float, width: float) -> np.ndarray:
    """HÀM GỐC TỪ SCRIPT CỦA BẠN (để đó, không dùng)."""
    img_min = center - width / 2
    img_max = center + width / 2
    windowed = np.clip(image, img_min, img_max)
    windowed = ((windowed - img_min) / (img_max - img_min) * 255).astype(np.uint8)
    return windowed

# --- HÀM MỚI ĐỂ TẠO CÁC GÓC NHÌN (DỰA TRÊN LOGIC GỐC) ---

def generate_views_for_all_axes(ctpa_volume_raw_latent, output_path, filename):
    """
    HÀM MỚI:
    Tạo và lưu các lát cắt PNG và ảnh GIF cho cả 3 góc nhìn.
    SỬ DỤNG LOGIC CHUẨN HÓA MIN-MAX TỪ HÀM video_tensor_to_gif GỐC.
    """
    views = {
        'axial': ctpa_volume_raw_latent,  # (D, H, W)
        'coronal': ctpa_volume_raw_latent.transpose(1, 0, 2),  # (H, D, W)
        'sagittal': ctpa_volume_raw_latent.transpose(2, 0, 1)  # (W, D, H)
    }

    for view_name, volume_view in views.items():
        print(f"🔄 Đang xử lý góc nhìn {view_name.upper()}...")

        # 1. Lưu TẤT CẢ các lát cắt PNG (Chuẩn hóa min-max TỪNG LÁT CẮT để xem rõ)
        slice_dir = output_path / f"{filename}_{view_name}_slices"
        slice_dir.mkdir(exist_ok=True, parents=True)
        num_slices = volume_view.shape[0]
        
        # Lưu tất cả slices
        for idx in range(num_slices):
            slice_img = volume_view[idx]
            min_s, max_s = slice_img.min(), slice_img.max()
            slice_norm = (slice_img - min_s) / (max_s - min_s + 1e-8)
            slice_img_255 = (slice_norm * 255).astype(np.uint8)
            cv2.imwrite(str(slice_dir / f"slice_{idx:04d}.png"), slice_img_255)
        print(f"✅ Đã lưu {num_slices} lát cắt PNG cho {view_name.upper()}.")

        # 2. Tạo và lưu ảnh GIF (Chuẩn hóa min-max TOÀN BỘ VOLUME)
        # Chuyển (F, H, W) -> (1, F, H, W)
        gif_tensor = torch.from_numpy(volume_view.copy()).float().unsqueeze(0)
        
        gif_path = output_path / f"{filename}_{view_name}.gif"
        # Gọi hàm video_tensor_to_gif GỐC (hàm này sẽ chuẩn hóa min-max toàn bộ)
        video_tensor_to_gif(gif_tensor, str(gif_path), duration=100)
        print(f"✅ Đã tạo GIF chất lượng cao (kiểu _none_style) cho {view_name.upper()}: {gif_path}")


class XrayToCTPAInference:
    """Class để inference từ X-ray sang CTPA (GIỮ NGUYÊN TỪ SCRIPT GỐC)"""
    
    def __init__(
        self,
        model_checkpoint: str,
        model_config: dict,
        device: str = 'cuda'
    ):
        self.device = device
        self.config = model_config
        self.model = self._load_model(model_checkpoint)
        self.model.eval()
        print(f"✅ Đã load model từ: {model_checkpoint}")
        print(f"🔧 Device: {device}")
        print(f"📊 Dataset range: [{model_config.get('dataset_min_value', -12.911299):.3f}, {model_config.get('dataset_max_value', 9.596558):.3f}]")
        
    def _load_model(self, checkpoint_path: str):
        """Load model từ checkpoint (GIỮ NGUYÊN TỪ SCRIPT GỐC)"""
        if self.config['denoising_fn'] == 'Unet3D':
            unet = Unet3D(
                dim=self.config['diffusion_img_size'],
                cond_dim=self.config.get('cond_dim', 512),
                dim_mults=self.config['dim_mults'],
                channels=self.config['diffusion_num_channels'],
                resnet_groups=8,
                classifier_free_guidance=self.config.get('classifier_free_guidance', False),
                medclip=self.config.get('medclip', True)
            ).to(self.device)
        elif self.config['denoising_fn'] == 'UNet':
            unet = UNet(
                in_ch=self.config['diffusion_num_channels'],
                out_ch=self.config['diffusion_num_channels'],
                spatial_dims=3
            ).to(self.device)
        else:
            raise ValueError(f"Model {self.config['denoising_fn']} không được hỗ trợ")
        
        diffusion = GaussianDiffusion(
            unet,
            vqgan_ckpt=self.config.get('vqgan_ckpt'),
            vae_ckpt=self.config.get('vae_ckpt'),
            image_size=self.config['diffusion_img_size'],
            num_frames=self.config['diffusion_depth_size'],
            channels=self.config['diffusion_num_channels'],
            timesteps=self.config.get('timesteps', 1000),
            img_cond=True,
            loss_type=self.config.get('loss_type', 'l1'),
            l1_weight=self.config.get('l1_weight', 1.0),
            perceptual_weight=self.config.get('perceptual_weight', 0.0),
            discriminator_weight=self.config.get('discriminator_weight', 0.0),
            classification_weight=self.config.get('classification_weight', 0.0),
            classifier_free_guidance=self.config.get('classifier_free_guidance', False),
            medclip=self.config.get('medclip', True),
            name_dataset=self.config.get('name_dataset', 'CTPA'),
            dataset_min_value=self.config.get('dataset_min_value', -12.911299),
            dataset_max_value=self.config.get('dataset_max_value', 9.596558),
        ).to(self.device)
        
        if os.path.exists(checkpoint_path):
            checkpoint = torch.load(checkpoint_path, map_location=self.device)
            if 'model' in checkpoint:
                diffusion.load_state_dict(checkpoint['model'], strict=False)
                print(f"✅ Loaded model state dict từ checkpoint")
            elif 'ema' in checkpoint:
                diffusion.load_state_dict(checkpoint['ema'], strict=False)
                print(f"✅ Loaded EMA model state dict từ checkpoint")
            else:
                diffusion.load_state_dict(checkpoint, strict=False)
                print(f"✅ Loaded state dict trực tiếp từ checkpoint")
        else:
            raise FileNotFoundError(f"Không tìm thấy checkpoint: {checkpoint_path}")
        
        return diffusion
    
    def preprocess_xray(self, xray_path: str) -> torch.Tensor:
        """Tiền xử lý X-ray (GIỮ NGUYÊN TỪ SCRIPT GỐC)"""
        if xray_path.endswith('.npy'):
            xray = np.load(xray_path).astype(np.float32)
        else:
            xray = cv2.imread(xray_path, cv2.IMREAD_GRAYSCALE)
            xray = cv2.resize(xray, (224, 224))
            xray = xray.astype(np.float32) / 255.0
        
        xray_tensor = torch.from_numpy(xray).float()
        
        if len(xray_tensor.shape) == 2:
            xray_tensor = xray_tensor.unsqueeze(0).unsqueeze(0)
        elif len(xray_tensor.shape) == 3:
            xray_tensor = xray_tensor.unsqueeze(0)
            
        return xray_tensor.to(self.device)
    
    def generate_ctpa(
        self, 
        xray_tensor: torch.Tensor,
        guidance_scale: float = 1.0,
        num_inference_steps: Optional[int] = None
    ) -> torch.Tensor:
        """Generate CTPA (GIỮ NGUYÊN TỪ SCRIPT GỐC)"""
        print("🔄 Đang generate CTPA...")
        with torch.no_grad():
            ctpa = self.model.sample(
                cond=xray_tensor,
                cond_scale=guidance_scale,
                batch_size=xray_tensor.shape[0]
            )
        print("✅ Đã generate CTPA thành công!")
        return ctpa
    
    def postprocess_ctpa(self, ctpa_tensor: torch.Tensor) -> np.ndarray:
        """Hậu xử lý (GIỮ NGUYÊN TỪ SCRIPT GỐC)"""
        ctpa_np = ctpa_tensor.cpu().numpy()
        # Bỏ qua các log debug
        if len(ctpa_np.shape) == 5:  # (B, C, D, H, W)
            ctpa_np = ctpa_np[0, 0]  # Lấy (D, H, W)
        elif len(ctpa_np.shape) == 4:  # (B, D, H, W) or (C, D, H, W)
            ctpa_np = ctpa_np[0]
        
        print(f"📊 CTPA shape sau postprocess: {ctpa_np.shape}")
        print(f"📊 CTPA range (raw latent): [{ctpa_np.min():.3f}, {ctpa_np.max():.3f}]")
        
        return ctpa_np
    
    def save_results(
        self,
        ctpa_volume: np.ndarray,
        output_dir: str,
        filename: str = "generated_ctpa",
        formats: list = ['npy', 'nii', 'png', 'gif']
    ):
        """
        *** HÀM ĐÃ ĐƯỢC CẬP NHẬT ***
        Lưu kết quả CTPA:
        1.  Lưu NIfTI (raw latent, giống _none_style.nii.gz)
        2.  Lưu NIfTI (denormalized, giống _denormalized_none_style.nii.gz)
        3.  Lưu NPY (raw latent)
        4.  Gọi hàm `generate_views_for_all_axes` để tạo 3 góc nhìn (PNG, GIF)
        """
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True, parents=True)
        
        dataset_min = self.config.get('dataset_min_value', -12.911299)
        dataset_max = self.config.get('dataset_max_value', 9.596558)
        
        # 1. Lưu NPY (raw latent)
        if 'npy' in formats:
            np.save(output_path / f"{filename}_raw.npy", ctpa_volume)
            print(f"✅ Đã lưu {filename}_raw.npy (raw latent data)")
        
        if 'nii' in formats:
            # 2. Lưu NIfTI (raw latent, giống _none_style.nii.gz)
            ctpa_oriented = apply_medical_orientation(ctpa_volume, use_training_transpose=False)
            ctpa_oriented_clipped = np.clip(ctpa_oriented, -1024, 3071).astype(np.float32) # Vẫn clip cho đúng chuẩn NIfTI
            nifti_image = create_medical_nifti(ctpa_oriented_clipped, spacing=(1.0, 1.0, 1.0))
            nii_path = output_path / f"{filename}_raw_latent.nii.gz"
            sitk.WriteImage(nifti_image, str(nii_path))
            print(f"✅ Đã lưu {filename}_raw_latent.nii.gz (giống _none_style.nii.gz)")
            
            # 3. Lưu NIfTI (denormalized, giống _denormalized_none_style.nii.gz)
            ctpa_denorm = denormalize_ctpa_volume(ctpa_volume, dataset_min, dataset_max)
            ctpa_denorm_oriented = apply_medical_orientation(ctpa_denorm, use_training_transpose=False)
            ctpa_denorm_oriented = np.clip(ctpa_denorm_oriented, -1024, 3071)
            nifti_denorm = create_medical_nifti(ctpa_denorm_oriented)
            denorm_path = output_path / f"{filename}_denormalized.nii.gz"
            sitk.WriteImage(nifti_denorm, str(denorm_path))
            print(f"✅ Đã lưu {filename}_denormalized.nii.gz (để so sánh)")
        
        # 4. Tạo PNG và GIF cho cả 3 góc nhìn
        if 'png' in formats or 'gif' in formats:
            # Chúng ta dùng raw latent volume để tạo GIF chất lượng cao
            generate_views_for_all_axes(ctpa_volume, output_path, filename)
    
    
    def inference_pipeline(
        self,
        xray_path: str,
        output_dir: str,
        filename: str = "generated_ctpa",
        guidance_scale: float = 1.0,
        show_viewer: bool = True, # Giữ nguyên tham số này từ script gốc
        formats: list = ['npy', 'nii', 'png', 'gif']
    ) -> Tuple[np.ndarray, Optional[object]]:
        """
        Pipeline inference hoàn chỉnh (GIỮ NGUYÊN TỪ SCRIPT GỐC,
        chỉ đổi tên biến `ctpa_volume` thành `ctpa_volume_raw_latent`)
        """
        print(f"🚀 Bắt đầu inference pipeline GIỐNG HỆT TRAINING CODE...")
        
        # 1. Preprocess X-ray
        xray_tensor = self.preprocess_xray(xray_path)
        print(f"✅ Preprocessed X-ray shape: {xray_tensor.shape}")
        
        # 2. Generate CTPA
        ctpa_tensor = self.generate_ctpa(xray_tensor, guidance_scale)
        print(f"✅ Generated CTPA shape: {ctpa_tensor.shape}")
        
        # 3. Postprocess (Lấy raw latent volume)
        ctpa_volume_raw_latent = self.postprocess_ctpa(ctpa_tensor)
        
        # 4. Save results với formats được chỉ định
        self.save_results(ctpa_volume_raw_latent, output_dir, filename, formats=formats)
        
        # 5. Create viewer (Giữ nguyên logic từ script gốc)
        viewer = None
        if show_viewer:
            try:
                from visualization_utils import CTSliceViewer
                # Chuẩn hóa min-max (giống GIF) để xem
                ctpa_for_viewer = denormalize_for_display(ctpa_volume_raw_latent)
                viewer = CTSliceViewer(ctpa_for_viewer)
                print("✅ Đã tạo CT viewer")
            except ImportError:
                print("⚠️ Không thể import CTSliceViewer, bỏ qua viewer")
        
        print("🎉 Inference pipeline hoàn thành!")
        print(f"   - GIF/PNG: Đã tạo 3 góc nhìn (Axial, Coronal, Sagittal) với chất lượng cao.")
        print(f"   - NIfTI: Đã lưu cả 2 file raw latent và denormalized.")
        
        return ctpa_volume_raw_latent, viewer


def main():
    """Hàm main để chạy inference (GIỮ NGUYÊN TỪ SCRIPT GỐC)"""
    parser = argparse.ArgumentParser(description="X-ray to CTPA Inference (3-View, High-Quality GIF)")
    parser.add_argument("--checkpoint", type=str,
                        default="/teamspace/studios/this_studio/model-81.pt",
                        help="Đường dẫn đến model checkpoint")

    parser.add_argument("--xray", type=str,
                        default="/teamspace/studios/this_studio/LIDC_dataset_final/XRay_preprocessed_224_224/LIDC-IDRI-0129.npy",
                        help="Đường dẫn đến ảnh X-ray input")

    parser.add_argument("--output", type=str, default="./inference_results", help="Thư mục output")
    parser.add_argument("--filename", type=str, default="generated_ctpa", help="Tên file output")
    parser.add_argument("--guidance-scale", type=float, default=1.0, help="Guidance scale")
    parser.add_argument("--device", type=str, default="cuda", help="Device (cuda/cpu)")
    parser.add_argument("--show-viewer", action="store_true", help="Hiển thị interactive viewer")
    args = parser.parse_args()
    
    # Cấu hình model (GIỮ NGUYÊN TỪ SCRIPT GỐC)
    model_config = {
        'denoising_fn': 'Unet3D',
        'diffusion_img_size': 32,
        'diffusion_depth_size': 128,  # Từ config
        'diffusion_num_channels': 4,
        'dim_mults': [1, 2, 4, 8],
        'cond_dim': 512,
        'timesteps': 1000,
        'loss_type': 'l1_lpips',  # Từ config
        'l1_weight': 1.0,
        'perceptual_weight': 0.01,  # Từ config
        'discriminator_weight': 0.0,
        'classification_weight': 0.0,
        'classifier_free_guidance': False,
        'medclip': True,
        'name_dataset': 'LIDC',  # Từ config
        'dataset_min_value': -12.911299,  # Từ config
        'dataset_max_value': 9.596558,   # Từ config
        'vae_ckpt': 'stabilityai/sd-vae-ft-mse-original',
        'vqgan_ckpt': None
    }
    
    # Khởi tạo inference
    inference = XrayToCTPAInference(
        model_checkpoint=args.checkpoint,
        model_config=model_config,
        device=args.device
    )
    
    formats = ['npy', 'nii', 'png', 'gif']
    
    # Chạy inference
    ctpa_volume, viewer = inference.inference_pipeline(
        xray_path=args.xray,
        output_dir=args.output,
        filename=args.filename,
        guidance_scale=args.guidance_scale,
        show_viewer=args.show_viewer,
        formats=formats
    )
    
    # Hiển thị viewer nếu được yêu cầu
    if args.show_viewer and viewer:
        print("🖥️  Hiển thị interactive viewer...")
        viewer.show_interactive_viewer()


if __name__ == "__main__":
    main()