import nibabel as nib
import numpy as np
from scipy.ndimage import zoom

def read_nii(file_path):
    """Đọc file .nii và trả về numpy array."""
    img = nib.load(file_path)
    data = img.get_fdata()
    return data

def resize_volume(volume, target_shape):
    """
    Resize 3D volume từ shape hiện tại sang target_shape.
    
    Args:
        volume: numpy array shape (128, 256, 256)
        target_shape: tuple, ví dụ (128, 128, 128) hoặc (256, 256, 256)
    
    Returns:
        resized_volume: numpy array với shape mới
    """
    zoom_factors = [t / c for t, c in zip(target_shape, volume.shape)]
    resized_volume = zoom(volume, zoom_factors, order=1)  # Linear interpolation
    return resized_volume

# Ví dụ sử dụng
file_path = "/teamspace/studios/this_studio/X-ray2CTPA/generated_ct_scan.nii"  # Thay bằng đường dẫn file .nii của bạn
volume = read_nii(file_path)
print("Original shape:", volume.shape)

# Resize sang 128x128x128
resized_128 = resize_volume(volume, (128, 128, 128))
print("Shape sau khi resize sang 128x128x128:", resized_128.shape)

# Resize sang 256x256x256
resized_256 = resize_volume(volume, (256, 256, 256))
print("Shape sau khi resize sang 256x256x256:", resized_256.shape)

# Lưu file .nii (tùy chọn)
def save_nii(data, output_path, ref_nii):
    new_img = nib.Nifti1Image(data, affine=ref_nii.affine, header=ref_nii.header)
    nib.save(new_img, output_path)

# Lưu kết quả
ref_nii = nib.load(file_path)
save_nii(resized_128, "resized_128.nii", ref_nii)
save_nii(resized_256, "resized_256.nii", ref_nii)