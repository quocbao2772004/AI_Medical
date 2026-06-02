import os
import torch
import matplotlib.pyplot as plt
import matplotlib.pyplot as plt
import seaborn as sns
import torch

from diffdrr.data import load_example_ct, read
from diffdrr.drr import DRR
from diffdrr.visualization import plot_drr

sns.set_context("talk")
def show(link):
    try:
        # Read in the volume and get its origin and spacing in world coordinates
        subject = read(link, labelmap=None, labels=None, orientation="AP", bone_attenuation_multiplier=1.0)

        # Initialize the DRR module for generating synthetic X-rays
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        drr = DRR(
            subject,     # An object storing the CT volume, origin, and voxel spacing
            sdd=1020.0,  # Source-to-detector distance (i.e., focal length)
            height=200,  # Image height (if width is not provided, the generated DRR is square)
            delx=2.0,    # Pixel spacing (in mm)
        ).to(device)
        rotations = torch.tensor([[0.0, 0.0, 0.0]], device=device)
        translations = torch.tensor([[0.0, 850.0, 0.0]], device=device)
        img = drr(rotations, translations, parameterization="euler_angles", convention="ZXY")
        plot_drr(img, ticks=False)
        folder=r'E:\project\AI-Medical-Image-Processing\diffdrr\DiffDRR\images'
        a=link.find('LIDC-IDRI-')
        s=""
        if a!=-1:
            s=str(link[a:a+14])+".png"
        else:
            s=""
        file_path = os.path.join(folder, s)
        
        plt.savefig(file_path)
        plt.show()

    except Exception as e:
        print(f"An error occurred: {e}")