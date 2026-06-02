import torch
from ddpm.diffusion import GaussianDiffusion, Unet3D 
import hydra
from omegaconf import OmegaConf
import os
import numpy as np
from PIL import Image
import imageio # Sử dụng imageio để lưu GIF

# --- Cấu hình ---
model_checkpoint_path = '/teamspace/studios/this_studio/model-9.pt' 
input_xray_path = '/teamspace/studios/this_studio/LIDC_dataset_final/XRay_preprocessed_224_224_2/LIDC-IDRI-0001.npy'

# Tên file đầu ra (không có đuôi)
output_base_name = 'generated_ct_scan4'

IMG_SIZE = 32
IMG_DEPTH = 128
IMG_CHANNELS = 4

# --- HÀM MỚI ĐỂ LƯU GIF ---
def save_volume_as_gif(volume_np, filename, duration=100):
    """Lưu một khối numpy 3D thành file GIF."""
    # Chuẩn hóa dữ liệu về khoảng [0, 255] và chuyển sang kiểu uint8
    volume_np = (volume_np - volume_np.min()) / (volume_np.max() - volume_np.min()) * 255
    volume_np = volume_np.astype(np.uint8)
    
    # Lấy các lát cắt 2D từ khối 3D
    frames = [Image.fromarray(frame) for frame in volume_np]
    
    # Lưu thành file GIF
    imageio.mimsave(filename, frames, duration=duration, loop=0)
    print(f"✅ Đã lưu file GIF tại: '{filename}'")

# --- Bắt đầu xử lý ---
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
    
    print(f"Hoàn tất sampling! Kích thước khối CT được tạo: {generated_ct.shape}")

    # --- PHẦN LƯU FILE ĐÃ ĐƯỢC NÂNG CẤP ---
    try:
        # Lấy ra khối numpy 3D có dạng (Depth, Height, Width)
        ct_volume_np = generated_ct.cpu().squeeze(0).squeeze(0).numpy()
        print(f"Kích thước khối numpy 3D: {ct_volume_np.shape}")

        # 1. Lưu mặt phẳng AXIAL (nhìn từ trên xuống)
        # Không cần thay đổi gì, vì chiều đầu tiên đã là chiều sâu
        save_volume_as_gif(ct_volume_np, f"{output_base_name}_axial.gif")

        # 2. Lưu mặt phẳng CORONAL (nhìn từ trước vào)
        # Cần xoay khối dữ liệu để chiều "Height" trở thành chiều đầu tiên
        coronal_volume = np.transpose(ct_volume_np, (1, 0, 2))
        save_volume_as_gif(coronal_volume, f"{output_base_name}_coronal.gif")

        # 3. Lưu mặt phẳng SAGITTAL (nhìn từ bên cạnh)
        # Cần xoay khối dữ liệu để chiều "Width" trở thành chiều đầu tiên
        sagittal_volume = np.transpose(ct_volume_np, (2, 0, 1))
        save_volume_as_gif(sagittal_volume, f"{output_base_name}_sagittal.gif")

    except Exception as e:
        print(f"❌ Lỗi khi xử lý và lưu file GIF: {e}")

if __name__ == '__main__':
    run()