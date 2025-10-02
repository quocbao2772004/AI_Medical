import streamlit as st
import os, io, re, time, tempfile, subprocess, uuid, datetime as dt
from pathlib import Path
import numpy as np
from PIL import Image
import torch
import torch.nn.functional as F
from torchvision import transforms

# ===== Config mặc định (đổi cho phù hợp máy bạn) =====
INFERENCE_SCRIPT = "/teamspace/studios/this_studio/X-ray2CTPA/inference.py"
DEFAULT_CKPT     = "/teamspace/studios/this_studio/model-81.pt"
ROOT_OUTPUT      = "/teamspace/studios/this_studio/output"   # sẽ tạo subfolder mỗi run

# ===== Tiền xử lý y hệt bạn đã mô tả =====
transform_xray = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(0.633, 0.181),
])

def format_xray(img_np):
    if img_np.ndim == 2:
        img_np = np.stack([img_np]*3, axis=-1)
    img_t = transform_xray(img_np).float()                      # (3,H,W)
    img_t = F.interpolate(img_t.unsqueeze(0), size=(224,224), mode='bilinear', align_corners=False)
    return img_t.squeeze().detach().cpu().numpy()               # (3,224,224)

def save_and_preprocess(uploaded_file):
    tmp_dir = Path(tempfile.mkdtemp(prefix="xray2ctpa_"))
    raw_png = tmp_dir / "input.png"
    with open(raw_png, "wb") as f:
        f.write(uploaded_file.read())
    img = Image.open(raw_png).convert('L')
    img_np = np.array(img, dtype=np.float32)
    m = float(np.max(img_np))
    if m > 0: img_np = img_np / m
    formatted = format_xray(img_np)
    npy_path = tmp_dir / "preprocessed.npy"
    np.save(npy_path, formatted)
    return npy_path, tmp_dir

def make_run_folder(base_output: str, uploaded_name: str, user_filename: str):
    os.makedirs(base_output, exist_ok=True)
    stem = Path(uploaded_name).stem.replace(" ", "_")
    ts = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    if not user_filename:
        user_filename = stem
    run_dir = Path(base_output) / f"{user_filename}_{stem}_{ts}_{uuid.uuid4().hex[:6]}"
    run_dir.mkdir(parents=True, exist_ok=True)
    # filename truyền vào inference (không chứa dấu cách)
    out_filename = Path(f"{user_filename}").stem.replace(" ", "_")
    return run_dir, out_filename

def parse_progress_and_eta_from_log(line: str):
    """
    Cố gắng bắt pattern kiểu 'step 123/1000' hoặc 't=123/1000' trong log.
    Trả về (progress_float_0_1, steps_done, steps_total) hoặc (None, None, None) nếu không tìm thấy.
    """
    m = re.search(r'(?i)(?:step|t)\s*[:=]?\s*(\d+)\s*/\s*(\d+)', line)
    if not m:
        return None, None, None
    done = int(m.group(1))
    total = max(1, int(m.group(2)))
    return min(1.0, done/total), done, total

def display_slice_viewer(axial_slice_dir, coronal_slice_dir, sagittal_slice_dir, key_suffix=""):
    """Hiển thị viewer slices: mỗi góc 1 dòng, Axial nhỏ, Coronal và Sagittal to"""
    # Initialize session state
    if 'slice_viewer' not in st.session_state:
        st.session_state.slice_viewer = {
            'axial': 0,
            'coronal': 0,
            'sagittal': 0,
        }
    
    # Helper function để load tất cả slices từ folder
    def load_all_slices(slice_dir):
        if slice_dir.exists():
            slice_files = sorted(list(slice_dir.glob("slice_*.png")))
            return slice_files
        return []
    
    # Load tất cả slices
    axial_slices = load_all_slices(axial_slice_dir)
    coronal_slices = load_all_slices(coronal_slice_dir)
    sagittal_slices = load_all_slices(sagittal_slice_dir)
    
    # Axial - nhỏ (1/2 kích thước)
    st.markdown("### Axial")
    if len(axial_slices) > 0:
        num_axial = len(axial_slices)
        current_axial = st.session_state.slice_viewer['axial']
        
        # Đảm bảo index hợp lệ
        if current_axial >= num_axial:
            current_axial = num_axial - 1
            st.session_state.slice_viewer['axial'] = current_axial
        if current_axial < 0:
            current_axial = 0
            st.session_state.slice_viewer['axial'] = current_axial
        
        # Hiển thị hình ảnh trước (Axial nhỏ - 1/2 kích thước)
        col_img_axial, col_control_axial = st.columns([1, 1])
        with col_img_axial:
            slice_img = Image.open(axial_slices[current_axial])
            # Giới hạn width để Axial nhỏ hơn
            st.image(slice_img, width=400)
        
        with col_control_axial:
            # Thanh slider giống YouTube - đặt trước để sync đúng (hiển thị từ 1)
            new_idx_display = st.slider(
                "Tua",
                min_value=1,
                max_value=num_axial,
                value=st.session_state.slice_viewer['axial'] + 1,
                key=f"axial_slider{key_suffix}",
                label_visibility="collapsed"
            )
            # Chuyển từ số hiển thị (1-based) về index (0-based)
            new_idx = new_idx_display - 1
            # Update session state ngay khi slider thay đổi
            if new_idx != st.session_state.slice_viewer['axial']:
                st.session_state.slice_viewer['axial'] = new_idx
                st.rerun()
            
            # Hiển thị slice number sau khi update
            st.caption(f"Slice {st.session_state.slice_viewer['axial'] + 1} of {num_axial}")
            
            # Nút điều khiển
            col_btn1, col_btn2 = st.columns(2)
            with col_btn1:
                if st.button("⏮️", key=f"axial_back{key_suffix}", width='stretch'):
                    st.session_state.slice_viewer['axial'] = max(0, current_axial - 1)
            with col_btn2:
                if st.button("⏭️", key=f"axial_next{key_suffix}", width='stretch'):
                    st.session_state.slice_viewer['axial'] = min(num_axial - 1, current_axial + 1)
    
    st.divider()
    
    # Coronal - bé bằng Axial
    st.markdown("### Coronal")
    if len(coronal_slices) > 0:
        num_coronal = len(coronal_slices)
        current_coronal = st.session_state.slice_viewer['coronal']
        
        # Đảm bảo index hợp lệ
        if current_coronal >= num_coronal:
            current_coronal = num_coronal - 1
            st.session_state.slice_viewer['coronal'] = current_coronal
        if current_coronal < 0:
            current_coronal = 0
            st.session_state.slice_viewer['coronal'] = current_coronal
        
        # Hiển thị hình ảnh trước (Coronal bé bằng Axial)
        col_img_coronal, col_control_coronal = st.columns([1, 1])
        with col_img_coronal:
            slice_img = Image.open(coronal_slices[current_coronal])
            st.image(slice_img, width=400)
        
        with col_control_coronal:
            # Thanh slider giống YouTube - đặt trước để sync đúng (hiển thị từ 1)
            new_idx_display = st.slider(
                "Tua",
                min_value=1,
                max_value=num_coronal,
                value=st.session_state.slice_viewer['coronal'] + 1,
                key=f"coronal_slider{key_suffix}",
                label_visibility="collapsed"
            )
            # Chuyển từ số hiển thị (1-based) về index (0-based)
            new_idx = new_idx_display - 1
            # Update session state ngay khi slider thay đổi
            if new_idx != st.session_state.slice_viewer['coronal']:
                st.session_state.slice_viewer['coronal'] = new_idx
                st.rerun()
            
            # Hiển thị slice number sau khi update
            st.caption(f"Slice {st.session_state.slice_viewer['coronal'] + 1} of {num_coronal}")
            
            # Nút điều khiển
            col_btn1, col_btn2 = st.columns(2)
            with col_btn1:
                if st.button("⏮️", key=f"coronal_back{key_suffix}", width='stretch'):
                    st.session_state.slice_viewer['coronal'] = max(0, current_coronal - 1)
            with col_btn2:
                if st.button("⏭️", key=f"coronal_next{key_suffix}", width='stretch'):
                    st.session_state.slice_viewer['coronal'] = min(num_coronal - 1, current_coronal + 1)
    
    st.divider()
    
    # Sagittal - bé bằng Axial
    st.markdown("### Sagittal")
    if len(sagittal_slices) > 0:
        num_sagittal = len(sagittal_slices)
        current_sagittal = st.session_state.slice_viewer['sagittal']
        
        # Đảm bảo index hợp lệ
        if current_sagittal >= num_sagittal:
            current_sagittal = num_sagittal - 1
            st.session_state.slice_viewer['sagittal'] = current_sagittal
        if current_sagittal < 0:
            current_sagittal = 0
            st.session_state.slice_viewer['sagittal'] = current_sagittal
        
        # Hiển thị hình ảnh trước (Sagittal bé bằng Axial)
        col_img_sagittal, col_control_sagittal = st.columns([1, 1])
        with col_img_sagittal:
            slice_img = Image.open(sagittal_slices[current_sagittal])
            st.image(slice_img, width=400)
        
        with col_control_sagittal:
            # Thanh slider giống YouTube - đặt trước để sync đúng (hiển thị từ 1)
            new_idx_display = st.slider(
                "Tua",
                min_value=1,
                max_value=num_sagittal,
                value=st.session_state.slice_viewer['sagittal'] + 1,
                key=f"sagittal_slider{key_suffix}",
                label_visibility="collapsed"
            )
            # Chuyển từ số hiển thị (1-based) về index (0-based)
            new_idx = new_idx_display - 1
            # Update session state ngay khi slider thay đổi
            if new_idx != st.session_state.slice_viewer['sagittal']:
                st.session_state.slice_viewer['sagittal'] = new_idx
                st.rerun()
            
            # Hiển thị slice number sau khi update
            st.caption(f"Slice {st.session_state.slice_viewer['sagittal'] + 1} of {num_sagittal}")
            
            # Nút điều khiển
            col_btn1, col_btn2 = st.columns(2)
            with col_btn1:
                if st.button("⏮️", key=f"sagittal_back{key_suffix}", width='stretch'):
                    st.session_state.slice_viewer['sagittal'] = max(0, current_sagittal - 1)
            with col_btn2:
                if st.button("⏭️", key=f"sagittal_next{key_suffix}", width='stretch'):
                    st.session_state.slice_viewer['sagittal'] = min(num_sagittal - 1, current_sagittal + 1)

def run_inference_with_live_progress(script, ckpt, xray_npy, outdir, fname, device, guidance):
    import re, time, subprocess, streamlit as st

    cmd = [
        "python", script,
        "--checkpoint", ckpt,
        "--xray", xray_npy,
        "--output", str(outdir),
        "--filename", fname,
        "--guidance-scale", str(guidance),
        "--device", device
    ]
    start = time.time()
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)

    progress = st.progress(0)  # tương thích mọi phiên bản (0..100)
    prog_val = 0.0             # 0..1 ta tự quản
    def set_progress(val, label=""):
        nonlocal prog_val
        prog_val = max(0.0, min(1.0, float(val)))
        # Streamlit progress cũ dùng 0..100
        try:
            progress.progress(prog_val, text=label)  # streamlit mới (hỗ trợ text)
        except TypeError:
            progress.progress(int(round(prog_val*100)))  # streamlit cũ
            if label:
                st.caption(label)

    log_area = st.empty()
    eta_area = st.empty()
    log_buffer = []

    have_steps = False
    last_done = 0
    total_steps = None
    step_times = []

    phase_marks = [
        ("Tiền xử lý / Load model", 0.10),
        ("Generate (khuếch tán)", 0.85),
        ("Hậu xử lý / Lưu file", 1.00),
    ]
    current_phase_idx = 0

    step_re = re.compile(r'(?i)(?:step|t)\s*[:=]?\s*(\d+)\s*/\s*(\d+)')
    # Pattern để bắt tqdm progress (ví dụ: "100%|██████████| 1000/1000 [00:30<00:00, 33.21it/s]")
    tqdm_re = re.compile(r'\s*\d+%\|.*?\|\s*\d+/\d+\s*\[.*?\]')

    for line in proc.stdout:
        line = line.rstrip("\n")
        
        # Chỉ hiển thị dòng có tqdm progress
        if tqdm_re.search(line) or step_re.search(line):
            log_buffer.append(line)
            # Giữ tối đa 50 dòng tqdm gần nhất
            if len(log_buffer) > 50:
                log_buffer = log_buffer[-50:]
            log_area.code("\n".join(log_buffer))

        m = step_re.search(line)
        if m:
            have_steps = True
            done = int(m.group(1))
            total = max(1, int(m.group(2)))
            total_steps = total if total_steps is None else total_steps
            # đo thời gian từng bước để ước ETA
            now = time.time()
            if done > last_done:
                step_times.append(now)
                last_done = done
            p = min(1.0, done / total)
            set_progress(p, f"Đang chạy inference... {done}/{total}")

            # ETA
            if len(step_times) >= 2:
                # lấy tốc độ trung bình 5 bước gần nhất
                recent = step_times[-5:]
                avg_step = (recent[-1] - recent[0]) / max(1, len(recent)-1)
                remain = (total - done) * avg_step
                eta_area.write(f"⏳ Ước tính còn ~ {int(remain)} giây")
        else:
            # Fallback theo pha nếu không có step
            if current_phase_idx < len(phase_marks):
                phase_name, phase_target = phase_marks[current_phase_idx]
                # tăng nhẹ dần đến ngưỡng pha
                next_val = min(phase_target, prog_val + 0.02)
                set_progress(next_val, f"{phase_name}...")
                if re.search(r'Loaded model|Generated CTPA|Đã generate CTPA|Lưu|Save results|GIF', line, re.I):
                    current_phase_idx = min(current_phase_idx + 1, len(phase_marks)-1)

    proc.wait()
    end = time.time()
    if proc.returncode == 0:
        set_progress(1.0, "Hoàn tất")
        eta_area.write(f"⏱️ Tổng thời gian: {int(end - start)} giây")
    else:
        set_progress(0.0, "Inference lỗi")
    return proc.returncode, "\n".join(log_buffer)

# ================== Streamlit UI ==================
st.set_page_config(page_title="X-ray → CTPA Inference", layout="wide")
st.title("Hệ thống tái tạo 3D CT từ ảnh 2D Xray")

with st.sidebar:
    st.subheader("⚙️ Cấu hình")
    ckpt      = st.text_input("Checkpoint (--checkpoint)", value=DEFAULT_CKPT)
    script    = st.text_input("Script inference.py", value=INFERENCE_SCRIPT)
    out_root  = st.text_input("Thư mục gốc output", value=ROOT_OUTPUT)
    base_name = st.text_input("Tên file output (base)", value="generated_ctpa")
    guidance  = st.number_input("guidance-scale", value=1.0, min_value=0.0, step=0.1)
    device    = st.selectbox("Device", options=["cuda", "cpu"], index=0)

UPLOADED_PREVIEW_WIDTH = 256  # ảnh upload nhỏ (khoảng 1/4 hiện tại)

uploaded = st.file_uploader("Tải ảnh X-ray (.png, .jpg, .jpeg)", type=["png", "jpg", "jpeg"])

# Xóa kết quả cũ nếu người dùng xóa ảnh upload
if uploaded is None:
    # Xóa session_state để ẩn GIF và viewer
    if 'last_run_dir' in st.session_state:
        del st.session_state.last_run_dir
    if 'last_out_fname' in st.session_state:
        del st.session_state.last_out_fname
    if 'slice_viewer' in st.session_state:
        del st.session_state.slice_viewer
    uploaded_bytes = None
elif uploaded:
    uploaded_bytes = uploaded.getvalue()
    st.image(
        uploaded_bytes,
        caption=f"Ảnh đã upload: {uploaded.name}",
        width=UPLOADED_PREVIEW_WIDTH   # << thu nhỏ thay vì fill container
    )
else:
    uploaded_bytes = None


go = st.button("🚀 Chạy inference")


if uploaded and go:
    st.info("Bắt đầu tiền xử lý…")
    npy_path, tmp_dir = save_and_preprocess(uploaded)
    st.write(f"Đã chuẩn bị .npy: {npy_path.name}")

    run_dir, out_fname = make_run_folder(out_root, uploaded.name, base_name)
    st.write(f"📂 Thư mục kết quả: `{run_dir}`")

    with st.status("Đang chạy inference…", expanded=True) as status:
        code, full_log = run_inference_with_live_progress(
            script=script,
            ckpt=ckpt,
            xray_npy=str(npy_path),
            outdir=str(run_dir),
            fname=out_fname,
            device=device,
            guidance=guidance
        )

        if code != 0:
            status.update(label="Inference thất bại", state="error")
            st.error("Inference lỗi. Log:")
            st.code(full_log)
        else:
            status.update(label="Inference hoàn tất", state="complete")
            # Lưu kết quả vào session_state để giữ lại sau khi rerun
            st.session_state.last_run_dir = str(run_dir)
            st.session_state.last_out_fname = out_fname

            # Tìm đúng 3 GIF trong đúng folder của run này
            axial_gif = run_dir / f"{out_fname}_axial.gif"
            coronal_gif = run_dir / f"{out_fname}_coronal.gif"
            sagittal_gif = run_dir / f"{out_fname}_sagittal.gif"

            # Tìm thư mục slices
            axial_slice_dir = run_dir / f"{out_fname}_axial_slices"
            coronal_slice_dir = run_dir / f"{out_fname}_coronal_slices"
            sagittal_slice_dir = run_dir / f"{out_fname}_sagittal_slices"

            missing = []
            for p in [axial_gif, coronal_gif, sagittal_gif]:
                if not p.exists(): missing.append(p.name)

            if missing:
                st.warning("Không tìm thấy đủ GIF mong đợi: " + ", ".join(missing) +
                           ". Kiểm tra lại tên file sinh ra trong hàm save_results/generate_views_for_all_axes.")

            # Phần 1: Khối GIF 3D
            st.subheader("🎞 Khối GIF 3D")
            
            # Layout: Axial bên trái (bé), Coronal và Sagittal bên phải (Sagittal dưới Coronal, quay dọc, bé)
            col_gif_left, col_gif_right = st.columns([1, 2])
            
            with col_gif_left:
                if axial_gif.exists():
                    st.markdown("**Axial**")
                    st.image(str(axial_gif), width=400)
            
            with col_gif_right:
                if coronal_gif.exists():
                    st.markdown("**Coronal**")
                    st.image(str(coronal_gif), width=400)
                if sagittal_gif.exists():
                    st.markdown("**Sagittal**")
                    st.image(str(sagittal_gif), width=400)

            # Viewer slices
            st.divider()
            st.subheader("🖼️ Xem từng slice")
            display_slice_viewer(axial_slice_dir, coronal_slice_dir, sagittal_slice_dir, key_suffix="")

            # Cho tải về 3 GIF
            st.divider()
            st.subheader("⬇️ Tải 3 GIF")
            for p in [axial_gif, coronal_gif, sagittal_gif]:
                if p.exists():
                    with open(p, "rb") as f:
                        st.download_button(
                            label=f"Tải {p.name}",
                            data=f.read(),
                            file_name=p.name,
                            mime="image/gif"
                        )

# Hiển thị kết quả từ lần chạy trước (nếu có) ngay cả khi không bấm button "Chạy inference"
if 'last_run_dir' in st.session_state and 'last_out_fname' in st.session_state:
    run_dir = Path(st.session_state.last_run_dir)
    out_fname = st.session_state.last_out_fname
    
    # Kiểm tra xem folder có tồn tại không
    if run_dir.exists():
        # Tìm đúng 3 GIF
        axial_gif = run_dir / f"{out_fname}_axial.gif"
        coronal_gif = run_dir / f"{out_fname}_coronal.gif"
        sagittal_gif = run_dir / f"{out_fname}_sagittal.gif"
        
        # Tìm thư mục slices
        axial_slice_dir = run_dir / f"{out_fname}_axial_slices"
        coronal_slice_dir = run_dir / f"{out_fname}_coronal_slices"
        sagittal_slice_dir = run_dir / f"{out_fname}_sagittal_slices"
        
        # Chỉ hiển thị nếu chưa hiển thị trong block trên
        if not (uploaded and go):
            # Phần 1: Khối GIF 3D - LUÔN HIỂN THỊ
            st.subheader("🎞 Khối GIF 3D")
            
            # Layout: Axial bên trái (bé), Coronal và Sagittal bên phải (Sagittal dưới Coronal, quay dọc, bé)
            col_gif_left, col_gif_right = st.columns([1, 2])
            
            with col_gif_left:
                if axial_gif.exists():
                    st.markdown("**Axial**")
                    st.image(str(axial_gif), width=400)
            
            with col_gif_right:
                if coronal_gif.exists():
                    st.markdown("**Coronal**")
                    st.image(str(coronal_gif), width=400)
                if sagittal_gif.exists():
                    st.markdown("**Sagittal**")
                    st.image(str(sagittal_gif), width=400)
            
            # Viewer slices
            st.divider()
            st.subheader("🖼️ Xem từng slice")
            display_slice_viewer(axial_slice_dir, coronal_slice_dir, sagittal_slice_dir, key_suffix="_prev")
            
            # Cho tải về 3 GIF
            st.divider()
            st.subheader("⬇️ Tải 3 GIF")
            for p in [axial_gif, coronal_gif, sagittal_gif]:
                if p.exists():
                    with open(p, "rb") as f:
                        st.download_button(
                            label=f"Tải {p.name}",
                            data=f.read(),
                            file_name=p.name,
                            mime="image/gif"
                        )
