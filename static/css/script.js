// static/js/script.js
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('fileElem'); // Adicionado para referência direta
const loadingDiv = document.getElementById('loading');
const resultText = document.getElementById('result-text');

// Prevenir comportamentos padrão do navegador
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    if (dropArea) {
        dropArea.addEventListener(eventName, preventDefaults, false);
    }
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Destacar a área de drop ao arrastar
if (dropArea) {
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
    });

    // Lidar com o arquivo solto
    dropArea.addEventListener('drop', handleDrop, false);
}


function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// Adiciona o listener para o input de arquivo
if (fileInput) {
    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
    });
}


// Lidar com os arquivos (seja do drop ou do input)
function handleFiles(files) {
    if (files.length > 0) {
        uploadFile(files[0]);
    }
}

// Função para fazer o upload do arquivo
async function uploadFile(file) {
    loadingDiv.classList.remove('hidden');
    resultText.textContent = ''; // Limpa o resultado anterior

    const formData = new FormData();
    formData.append('file', file);

    try {
        // A LINHA MAIS IMPORTANTE - VERIFIQUE SE A URL ESTÁ CORRETA
        const response = await fetch('http://127.0.0.1:5000/ocr', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Erro HTTP: ${response.status}` }));
            throw new Error(errorData.error);
        }

        const data = await response.json();
        resultText.textContent = data.text || 'Nenhum texto foi encontrado na imagem.';

    } catch (error) {
        console.error('Erro no upload ou processamento:', error);
        resultText.textContent = `Ocorreu um erro ao processar o arquivo. Verifique o console (F12) para mais detalhes. Erro: ${error.message}`;
    } finally {
        loadingDiv.classList.add('hidden');
    }
}