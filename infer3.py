import torch
from ddpm.diffusion import GaussianDiffusion, Unet3D
import hydra
from omegaconf import OmegaConf
import os
import numpy as np
from PIL import Image
import trimesh # Thư viện mới để xử lý 3D

# --- Cấu hình (VUI LÒNG SỬA CÁC THAM SỐ NÀY) ---

# 1. Đường dẫn đến file checkpoint (.pt) của model đã huấn luyện
model_checkpoint_path = '/teamspace/studios/this_studio/model-9.pt' 

# 2. Đường dẫn đến file X-quang (.npy) bạn muốn dùng làm đầu vào
input_xray_path = '/teamspace/studios/this_studio/LIDC_dataset_final/XRay_preprocessed_224_224_2/LIDC-IDRI-0410.npy'

# 3. Tên file đầu ra (không có đuôi)
output_base_name = 'generated_ct_scan'

# 4. Các tham số của model (phải giống hệt lúc huấn luyện)
IMG_SIZE = 32
IMG_DEPTH = 128
IMG_CHANNELS = 4
# gpus = 0 # Không còn cần thiết khi chạy trên CPU

# --- Bắt đầu xử lý ---

@hydra.main(config_path='./config', config_name='base_cfg', version_base=None)
def run(cfg: OmegaConf):
    print("--- Bắt đầu quá trình tạo ảnh trên CPU ---")
    
    # -- 1. Tải mô hình --
    device = torch.device('cuda')

    model = Unet3D(
        dim=IMG_SIZE,
        cond_dim=cfg.model.cond_dim,
        dim_mults=cfg.model.dim_mults,
        channels=IMG_CHANNELS,
    ).to(device)

    diffusion = GaussianDiffusion(
        model,
        vqgan_ckpt=None, 
        vae_ckpt=cfg.model.vae_ckpt, 
        image_size=IMG_SIZE,
        num_frames=IMG_DEPTH,
        channels=IMG_CHANNELS,
        timesteps=cfg.model.timesteps,
        img_cond=True,
    ).to(device)

    print(f"Đang tải model từ: {model_checkpoint_path}")
    data = torch.load(model_checkpoint_path, map_location=device)
    diffusion.load_state_dict(data['ema']) # Sử dụng trọng số EMA để có kết quả tốt hơn
    diffusion.eval()
    print("Đã tải thành công model.")

    # -- 2. Chuẩn bị dữ liệu đầu vào --
    xray_np = np.load(input_xray_path)
    xray_tensor = torch.from_numpy(xray_np).float().to(device)
    xray_tensor = xray_tensor.unsqueeze(0) 
    
    print(f"Đã tải ảnh X-quang đầu vào, kích thước: {xray_tensor.shape}")

    # -- 3. Tạo ảnh 3D --
    with torch.no_grad():
        print("Bắt đầu quá trình sampling... việc này sẽ chậm hơn đáng kể trên CPU.")
        generated_ct = diffusion.sample(cond=xray_tensor, batch_size=1, cond_scale=1.0)
    
    print(f"Hoàn tất sampling! Kích thước khối CT được tạo: {generated_ct.shape}")

    # --- PHẦN LƯU FILE ĐÃ ĐƯỢC THAY THẾ HOÀN TOÀN ---

    # -- 4. Chuẩn bị dữ liệu để xuất file --
    # Loại bỏ chiều batch và channel, chuyển sang numpy
    ct_volume_np = generated_ct.cpu().squeeze(0).squeeze(0).numpy()
    
    # Chuẩn hóa dữ liệu về khoảng [0, 1] để xử lý
    ct_volume_np = (ct_volume_np - ct_volume_np.min()) / (ct_volume_np.max() - ct_volume_np.min())

    # -- 5. Lưu lát cắt 2D trung tâm ra file PNG --
    try:
        # Lấy lát cắt ở giữa theo chiều sâu
        middle_slice_index = ct_volume_np.shape[0] // 2
        middle_slice = ct_volume_np[middle_slice_index, :, :]
        
        # Chuyển đổi sang định dạng ảnh 8-bit
        slice_img = Image.fromarray((middle_slice * 255).astype(np.uint8), 'L')
        
        output_png_path = f"{output_base_name}_slice.png"
        slice_img.save(output_png_path)
        print(f"✅ Đã lưu lát cắt 2D trung tâm tại: '{output_png_path}'")
    except Exception as e:
        print(f"❌ Lỗi khi lưu file PNG: {e}")


    # -- 6. Tạo và lưu file 3D GLB --
    try:
        print("Bắt đầu chuyển đổi sang mô hình 3D...")
        # Sử dụng thuật toán Marching Cubes để tạo một bề mặt lưới (mesh) từ khối dữ liệu
        # `level=0.5` có nghĩa là bề mặt sẽ được tạo ở ngưỡng giá trị 50%
        mesh = trimesh.voxel.ops.matrix_to_marching_cubes(
            matrix=ct_volume_np,
            pitch=1.0  # Hoặc một giá trị float khác
        )

        if not mesh.is_empty:
            # Xuất lưới 3D ra định dạng GLB
            output_glb_path = f"{output_base_name}.glb"
            mesh.export(output_glb_path, file_type='glb')
            print(f"✅ Đã lưu mô hình 3D tương tác tại: '{output_glb_path}'")
        else:
            print("⚠️ Cảnh báo: Không thể tạo được mesh 3D từ khối dữ liệu. Khối dữ liệu có thể trống hoặc ngưỡng level không phù hợp.")

    except Exception as e:
        print(f"❌ Lỗi khi tạo file GLB: {e}")

if __name__ == '__main__':
    run()