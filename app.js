let galleries = [];

function addGallery() {
  const name = prompt("Enter gallery name:");
  if (!name) return;
  const gallery = { name, photos: [] };
  galleries.push(gallery);
  renderGalleries();
}

function renderGalleries() {
  const container = document.getElementById('galleries');
  container.innerHTML = '';
  galleries.forEach((g, index) => {
    const div = document.createElement('div');
    div.className = 'gallery';
    div.innerHTML = `<h3>${g.name}</h3>
      <button onclick="addPhoto(${index})">Add Photo</button>
      <div>${g.photos.map(p => `<img src="${p}" />`).join('')}</div>`;
    container.appendChild(div);
  });
}

function addPhoto(index) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'camera';
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      galleries[index].photos.push(reader.result);
      renderGalleries();
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

async function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const name = document.getElementById('customerName').value;
  const address = document.getElementById('customerAddress').value;
  doc.text(`Customer: ${name}`, 10, 10);
  doc.text(`Address: ${address}`, 10, 20);
  let y = 30;
  galleries.forEach(g => {
    doc.text(`Gallery: ${g.name}`, 10, y);
    y += 10;
    g.photos.forEach(p => {
      doc.addImage(p, 'JPEG', 10, y, 40, 40);
      y += 50;
    });
  });
  doc.save('CCTV-Checklist.pdf');
}