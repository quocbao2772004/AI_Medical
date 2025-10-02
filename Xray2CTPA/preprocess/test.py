import torch
from ddpm import GaussianDiffusion
from ddpm.unet import Unet3D # Hoặc Unet3D tùy vào model bạn đã huấn luyện
import hydra
from omegaconf import OmegaConf
import os
import numpy as np
from PIL import Image
import torchvision.transforms as T
from ddpm.diffusion import video_tensor_to_gif

# --- Cấu hình (VUI LÒNG SỬA CÁC THAM SỐ NÀY) ---

# 1. Đường dẫn đến file checkpoint (.pt) của model đã huấn luyện
model_checkpoint_path = './checkpoints/ddpm/XRAY_LIDC/your_model.pt'

# 2. Đường dẫn đến file X-quang (.npy) bạn muốn dùng làm đầu vào
input_xray_path = './LIDC_dataset_final/XRay_preprocessed_224_224/LIDC-IDRI-0002.npy'

# 3. Tên file GIF 3D đầu ra
output_gif_path = 'generated_ct_scan.gif'

# 4. Các tham số của model (phải giống hệt lúc huấn luyện)
IMG_SIZE = 32
IMG_DEPTH = 128
IMG_CHANNELS = 4
gpus = 0 # GPU ID để chạy

# --- Bắt đầu xử lý ---

@hydra.main(config_path='./config', config_name='base_cfg', version_base=None)
def run(cfg: OmegaConf):
    print("--- Bắt đầu quá trình tạo ảnh ---")
    
    # -- 1. Tải mô hình --
    device = torch.device(f'cuda:{gpus}')

    # Khởi tạo mô hình Unet
    model = Unet3D(
        dim=IMG_SIZE,
        cond_dim=cfg.model.cond_dim,
        dim_mults=cfg.model.dim_mults,
        channels=IMG_CHANNELS,
    ).to(device)

    # Khởi tạo mô hình Diffusion
    diffusion = GaussianDiffusion(
        model,
        vqgan_ckpt=None, # Không cần VQGAN khi inference
        vae_ckpt=cfg.model.vae_ckpt, # Cần VAE để giải mã
        image_size=IMG_SIZE,
        num_frames=IMG_DEPTH,
        channels=IMG_CHANNELS,
        timesteps=cfg.model.timesteps,
        img_cond=True,
    ).to(device)

    # Tải trọng số đã huấn luyện
    data = torch.load(model_checkpoint_path, map_location=device)
    diffusion.load_state_dict(data['ema']) # Sử dụng trọng số EMA để có kết quả tốt hơn
    diffusion.eval()
    print(f"Đã tải thành công model từ: {model_checkpoint_path}")

    # -- 2. Chuẩn bị dữ liệu đầu vào --
    xray_np = np.load(input_xray_path)
    xray_tensor = torch.from_numpy(xray_np).float().to(device)
    xray_tensor = xray_tensor.unsqueeze(0) # Thêm chiều batch (batch size = 1)
    
    print(f"Đã tải ảnh X-quang đầu vào, kích thước: {xray_tensor.shape}")

    # -- 3. Tạo ảnh 3D --
    with torch.no_grad():
        print("Bắt đầu quá trình sampling... việc này có thể mất vài phút.")
        # cond_scale > 1.0 để kích hoạt classifier-free guidance
        generated_ct = diffusion.sample(cond=xray_tensor, batch_size=1, cond_scale=1.0)
    
    print(f"Hoàn tất sampling! Kích thước khối CT được tạo: {generated_ct.shape}")

    # -- 4. Lưu kết quả --
    # Chuyển tensor thành định dạng có thể lưu ra GIF
    # Khối CT có thể có giá trị âm, cần chuẩn hóa về [0, 1] để hiển thị
    generated_ct = (generated_ct - generated_ct.min()) / (generated_ct.max() - generated_ct.min())
    video_tensor_to_gif(generated_ct.cpu(), output_gif_path, duration = 120, loop = 0, optimize = True)
    
    print(f"✅ Hoàn tất! File 3D CT đã được lưu tại: '{output_gif_path}'")

if __name__ == '__main__':
    run()