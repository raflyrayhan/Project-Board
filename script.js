// --- CONFIGURATIONS ---
const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbzOBhvw1KkvtSjPqz79m0N63zgk1gnZL_J-Nw-2LEkJyjSmVc-BSuhJMayRfoB2lujx/exec"; // ganti dengan URL Anda
const iframeSrc = {
  dashboard: "https://lookerstudio.google.com/embed/reporting/6eeec8b8-2588-4eb2-bcdb-e65cb694c099/page/Gv9RF",
};
const sectionTitle = {
  dashboard: "General",
  upload: "Upload Progress Report"
};
const sectionDesc = {
  dashboard: "Monitoring utama proyek, menampilkan overview performa dan status terkini seluruh aspek proyek.",
  upload: "Upload laporan dan lihat daftar dokumen pada folder Google Drive."
};

// --- RENDER SECTION ---
function showSection(section) {
  document.getElementById('main-title').innerText = sectionTitle[section];
  document.getElementById('main-desc').innerText = sectionDesc[section];

  document.getElementById('iframe-container').style.display = "none";
  document.getElementById('upload-drive-wrapper').style.display = "none";

  if (section === 'dashboard') {
    document.getElementById('iframe-container').style.display = "block";
    document.getElementById('main-iframe').src = iframeSrc[section];
  } else if (section === 'upload') {
    document.getElementById('upload-drive-wrapper').style.display = "flex";
    loadGalleryFromDrive();
  }
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const section = link.getAttribute('data-section');
      showSection(section);
    });
  });
  showSection('dashboard');
});

// --- UPLOAD TO CLOUDINARY AND SAVE TO GOOGLE DRIVE ---
async function uploadToCloudinary() {
  const file = document.getElementById('fileInput').files[0];
  if (!file) return alert("Silakan pilih file.");

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'project_unsigned'); // pastikan preset ini ada di Cloudinary

  try {
    const res = await fetch("https://api.cloudinary.com/v1_1/doicm5hba/auto/upload", {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!data.secure_url) throw new Error("Gagal upload ke Cloudinary");

    document.getElementById('uploadStatus').innerHTML = `
      <span style="color:green;">✅ Berhasil diunggah: 
        <a href="${data.secure_url}" target="_blank">${data.original_filename}</a>
      </span>`;

    // Kirim ke GAS untuk simpan link ke Google Drive
    const gasRes = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileUrl: data.secure_url,
        fileName: data.original_filename,
        mimeType: file.type || "application/octet-stream"
      })
    });

    const gasData = await gasRes.json();
    if (gasData.status === "success") {
      loadGalleryFromDrive();
    } else {
      throw new Error(gasData.message || "Gagal simpan ke Google Drive");
    }

  } catch (err) {
    console.error(err);
    document.getElementById('uploadStatus').innerHTML = `<span style="color:red;">❌ Gagal upload: ${err.message}</span>`;
  }
}

// --- LOAD FILES FROM DRIVE ---
async function loadGalleryFromDrive() {
  try {
    const res = await fetch(GAS_ENDPOINT);
    const files = await res.json();

    if (!Array.isArray(files)) throw new Error("Invalid response");

    const html = files.map(file => `
      <div style="margin-bottom:10px;display:flex;align-items:center;gap:10px;">
        <img src="https://www.gstatic.com/images/icons/material/system/2x/insert_drive_file_black_24dp.png" width="20">
        <a href="${file.url}" target="_blank">${file.name}</a>
      </div>
    `).join('');

    document.getElementById('galleryDrive').innerHTML = html || "<span>Tidak ada file ditemukan.</span>";
  } catch (err) {
    console.error(err);
    document.getElementById('galleryDrive').innerHTML = `<span style="color:red;">❌ Gagal load file: ${err.message}</span>`;
  }
}
