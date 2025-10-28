// Cases dataset for CTPA and LIDC-IDRI
const cases = {
  ctpa: [
    {
      xray: 'assets/4015007782447_xray.png',
      output: 'assets/4015007782447.gif',
      reference: 'assets/4015007782447_0.gif',
      description: 'A contrast-enhanced pulmonary angiography example.'
    },
    {
      xray: 'assets/4015008525303_xray.png',
      output: 'assets/4015008525303.gif',
      reference: 'assets/4015008525303_0.gif',
      description: 'A second CTPA case with an anatomically rich vascular volume.'
    },
    {
      xray: 'assets/4015009934504_xray.png',
      output: 'assets/4015009934504.gif',
      reference: 'assets/4015009934504_0.gif',
      description: 'A representative sample from the held-out validation set.'
    }
  ],
  lidc: [
    {
      xray: 'assets/x-ray input.jpg',
      output: 'assets/LIDC-IDRI-0046.gif',
      reference: 'assets/LIDC-IDRI-0046_0.gif',
      description: 'A lung CT case from the benchmark LIDC-IDRI dataset.'
    },
    {
      xray: 'assets/x-ray.jpg',
      output: 'assets/4015007720739.gif',
      reference: 'assets/4015007720739_0.gif',
      description: 'A second low-dose lung screening reconstruction example.'
    },
    {
      xray: 'assets/4015007782447_xray.png',
      output: 'assets/4015007782447.gif',
      reference: 'assets/4015007782447_0.gif',
      description: 'A cross-dataset comparison showing fine parenchymal detail.'
    }
  ]
};

let caseIndexCtpa = 0;
let caseIndexLidc = 0;

function setupDatasetViewer(datasetKey, elements) {
  const dataList = cases[datasetKey];

  function render() {
    const currentIndex = datasetKey === 'ctpa' ? caseIndexCtpa : caseIndexLidc;
    const item = dataList[currentIndex];
    if (!item) return;

    const imgs = [elements.xray, elements.ct, elements.reference];
    imgs.forEach(img => {
      if (img) img.style.opacity = '0.5';
    });

    setTimeout(() => {
      if (elements.xray) {
        elements.xray.onerror = function() {
          this.src = datasetKey === 'ctpa' ? 'assets/xray_ctpa.png' : 'assets/xray_lidc.png';
        };
        elements.xray.src = item.xray;
      }
      if (elements.ct) elements.ct.src = item.output;
      if (elements.reference) elements.reference.src = item.reference;
      if (elements.desc) elements.desc.textContent = item.description;
      if (elements.num) elements.num.textContent = String(currentIndex + 1).padStart(2, '0');

      imgs.forEach(img => {
        if (img) img.style.opacity = '1';
      });
    }, 100);

    elements.dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentIndex);
      dot.setAttribute('aria-current', idx === currentIndex ? 'true' : 'false');
    });
  }

  if (elements.prev) {
    elements.prev.addEventListener('click', () => {
      if (datasetKey === 'ctpa') {
        caseIndexCtpa = (caseIndexCtpa - 1 + dataList.length) % dataList.length;
      } else {
        caseIndexLidc = (caseIndexLidc - 1 + dataList.length) % dataList.length;
      }
      render();
    });
  }

  if (elements.next) {
    elements.next.addEventListener('click', () => {
      if (datasetKey === 'ctpa') {
        caseIndexCtpa = (caseIndexCtpa + 1) % dataList.length;
      } else {
        caseIndexLidc = (caseIndexLidc + 1) % dataList.length;
      }
      render();
    });
  }

  elements.dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.case, 10);
      if (!isNaN(idx)) {
        if (datasetKey === 'ctpa') {
          caseIndexCtpa = idx;
        } else {
          caseIndexLidc = idx;
        }
        render();
      }
    });
  });

  render();
}

// Copy BibTeX functionality
const copyCitationBtn = document.getElementById('copyCitationBtn');
const copyBtnText = document.getElementById('copyBtnText');
const bibtexText = document.getElementById('bibtexText');
const toast = document.getElementById('toast');

if (copyCitationBtn && bibtexText) {
  copyCitationBtn.addEventListener('click', async () => {
    const textToCopy = bibtexText.innerText.trim();
    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast('BibTeX citation copied to clipboard!');
      copyCitationBtn.classList.add('copied');
      if (copyBtnText) copyBtnText.textContent = 'Copied!';

      setTimeout(() => {
        copyCitationBtn.classList.remove('copied');
        if (copyBtnText) copyBtnText.textContent = 'Copy BibTeX';
      }, 2500);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      showToast('BibTeX citation copied!');
      copyCitationBtn.classList.add('copied');
      if (copyBtnText) copyBtnText.textContent = 'Copied!';

      setTimeout(() => {
        copyCitationBtn.classList.remove('copied');
        if (copyBtnText) copyBtnText.textContent = 'Copy BibTeX';
      }, 2500);
    }
  });
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupDatasetViewer('ctpa', {
    xray: document.getElementById('xrayImageCtpa'),
    ct: document.getElementById('ctImageCtpa'),
    reference: document.getElementById('referenceImageCtpa'),
    desc: document.getElementById('caseDescriptionCtpa'),
    num: document.getElementById('caseNumberCtpa'),
    prev: document.getElementById('prevCaseCtpa'),
    next: document.getElementById('nextCaseCtpa'),
    dots: document.querySelectorAll('#dotsCtpa .dot-btn')
  });

  setupDatasetViewer('lidc', {
    xray: document.getElementById('xrayImageLidc'),
    ct: document.getElementById('ctImageLidc'),
    reference: document.getElementById('referenceImageLidc'),
    desc: document.getElementById('caseDescriptionLidc'),
    num: document.getElementById('caseNumberLidc'),
    prev: document.getElementById('prevCaseLidc'),
    next: document.getElementById('nextCaseLidc'),
    dots: document.querySelectorAll('#dotsLidc .dot-btn')
  });
});