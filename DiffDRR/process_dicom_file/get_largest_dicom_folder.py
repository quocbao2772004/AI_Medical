import os
def get_largest_subfolder(base_folder):
    max_size = 0
    largest_subfolder = None

    for folder_name in os.listdir(base_folder):
        folder_path = os.path.join(base_folder, folder_name)
        if os.path.isdir(folder_path):

            folder_size = sum(
                os.path.getsize(os.path.join(root, file))
                for root, _, files in os.walk(folder_path)
                for file in files
            )

            if folder_size > max_size:
                max_size = folder_size
                largest_subfolder = folder_path

    return largest_subfolder