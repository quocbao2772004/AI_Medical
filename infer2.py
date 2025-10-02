import torch
from ddpm.diffusion import GaussianDiffusion, Unet3D 
import hydra
from omegaconf import OmegaConf
import os
import numpy as np
import SimpleITK as sitk
from scipy.ndimage import zoom # Thư viện mới để thay đổi kích thước

# --- Cấu hình ---
model_checkpoint_path = '/teamspace/studios/this_studio/model-9.pt' 
input_xray_path = '/teamspace/studios/this_studio/LIDC_dataset_final/XRay_preprocessed_224_224_2/LIDC-IDRI-0001.npy'

# --- THAY ĐỔI CHÍNH: Đặt kích thước đầu ra mong muốn ---
# Bạn có thể thay đổi thành (128, 128, 128) nếu muốn
desired_shape = (256, 256, 256) 
output_nii_path = f'generated_ct_scan_{desired_shape[0]}.nii' # Tên file sẽ tự cập nhật

IMG_SIZE = 32
IMG_DEPTH = 128
IMG_CHANNELS = 4

@hydra.main(config_path='./config', config_name='base_cfg', version_base=None)
def run(cfg: OmegaConf):
    print("--- Bắt đầu quá trình tạo ảnh trên CPU ---")
    
    device = torch.device('cuda')
    model = Unet3D(dim=IMG_SIZE, cond_dim=cfg.model.cond_dim, dim_mults=cfg.model.dim_mults, channels=IMG_CHANNELS).to(device)
    diffusion = GaussianDiffusion(model, vae_ckpt=cfg.model.vae_ckpt, image_size=IMG_SIZE, num_frames=IMG_DEPTH, channels=IMG_CHANNELS, timesteps=cfg.model.timesteps, img_cond=True).to(device)

    print(f"Đang tải model từ: {model_checkpoint_path}")
    data = torch.load(model_checkpoint_path, map_location=device)
    diffusion.load_state_dict(data['ema'])
    diffusion.eval()
    print("Đã tải thành công model.")

    xray_np = np.load(input_xray_path)
    xray_tensor = torch.from_numpy(xray_np).float().to(device).unsqueeze(0)
    
    print(f"Đã tải ảnh X-quang đầu vào, kích thước: {xray_tensor.shape}")

    with torch.no_grad():
        print("Bắt đầu quá trình sampling...")
        generated_ct = diffusion.sample(cond=xray_tensor, batch_size=1, cond_scale=1.0)
    
    print(f"Hoàn tất sampling! Kích thước khối CT gốc: {generated_ct.shape}")

    # --- PHẦN HẬU XỬ LÝ VÀ LƯU FILE ---
    try:
        # Lấy ra khối numpy 3D
        ct_volume_np = generated_ct.cpu().squeeze(0).squeeze(0).numpy()
        
        # --- THAY ĐỔI CHÍNH: Thay đổi kích thước khối dữ liệu ---
        print(f"Đang thay đổi kích thước từ {ct_volume_np.shape} sang {desired_shape}...")
        # Tính toán tỉ lệ zoom cho mỗi chiều
        zoom_factors = [d / s for d, s in zip(desired_shape, ct_volume_np.shape)]
        # Thực hiện thay đổi kích thước
        resized_volume_np = zoom(ct_volume_np, zoom_factors, order=1) # order=1 cho bilinear interpolation
        print(f"Đã thay đổi kích thước thành công: {resized_volume_np.shape}")

        # Chuyển mảng NumPy đã được resize thành đối tượng ảnh SimpleITK
        sitk_image = sitk.GetImageFromArray(resized_volume_np)
        
        # Ghi ảnh ra file
        sitk.WriteImage(sitk_image, output_nii_path)
        
        print(f"✅ Hoàn tất! File 3D CT đã được lưu tại: '{output_nii_path}'")

    except Exception as e:
        print(f"❌ Lỗi khi xử lý và lưu file NIfTI: {e}")

if __name__ == '__main__':
    run()