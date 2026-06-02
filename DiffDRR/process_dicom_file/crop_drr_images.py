import os
from PIL import Image

def crop_images(folder):
    try:
        if not os.path.exists(folder):
            print(f"Thư mục {folder} không tồn tại.")
            return
        for filename in os.listdir(folder):
            if filename.endswith(".png"):
                file_path = os.path.join(folder, filename)
                with Image.open(file_path) as img:
                    left = 321
                    top = 61
                    right = img.width - 294
                    bottom = img.height - 54
                    img_cropped = img.crop((left, top, right, bottom))
                    img_cropped.save(os.path.join('E:\project\AI-Medical-Image-Processing\diffdrr\DiffDRR\images_cropped2',filename))
                    print(f"Đã cắt và lưu {filename}")
    except Exception as e:
        print(f"Có lỗi xảy ra: {e}")

folder = r'E:\project\AI-Medical-Image-Processing\diffdrr\DiffDRR\images'
crop_images(folder)
