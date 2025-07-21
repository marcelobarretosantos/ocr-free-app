// static/js/script.js - VERSÃO FINAL COMPLETA (COM CÂMERA E TODAS AS FUNÇÕES)

document.addEventListener('DOMContentLoaded', () => {

    // --- REFERÊNCIAS AOS ELEMENTOS DO HTML ---
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileElem');
    const loadingDiv = document.getElementById('loading');
    const resultText = document.getElementById('result-text');
    // Botões de ação
    const copyBtn = document.getElementById('copy-btn');
    const downloadWordBtn = document.getElementById('download-word-btn');
    const clearBtn = document.getElementById('clear-btn');
    // Controles de idioma e tradução
    const langSelect = document.getElementById('lang-select');
    const translationControls = document.getElementById('translation-controls');
    const translateLangSelect = document.getElementById('translate-to-lang');
    const translateBtn = document.getElementById('translate-btn');
    // Elementos da Câmera
    const cameraBtn = document.getElementById('camera-btn');
    const cameraModal = document.getElementById('camera-modal');
    const cameraView = document.getElementById('camera-view');
    const captureBtn = document.getElementById('capture-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    // --- VARIÁVEIS GLOBAIS ---
    let cameraStream = null;
    let originalOcrText = '';
    
    // =============================================
    // --- LÓGICA DA CÂMERA ---
    // =============================================
    const startCamera = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                cameraStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' }
                });
                cameraView.srcObject = cameraStream;
                cameraModal.classList.remove('hidden');
            } catch (error) {
                console.error("Erro ao acessar a câmera: ", error);
                alert("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
            }
        } else {
            alert("Seu navegador não suporta acesso à câmera.");
        }
    };
    
    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        cameraModal.classList.add('hidden');
    };

    const handleCapture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = cameraView.videoWidth;
        canvas.height = cameraView.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(cameraView, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
            const timestamp = Date.now();
            const capturedFile = new File([blob], `captura-${timestamp}.png`, { type: 'image/png' });
            handleFiles([capturedFile]);
        }, 'image/png');
        
        stopCamera();
    };

    // =============================================
    // --- OUTRAS FUNÇÕES E LÓGICAS ---
    // =============================================

    // Função para colar imagem (Ctrl+V)
    const handlePaste = (e) => {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;
        const items = clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                const timestamp = Date.now();
                const pastedFile = new File([file], `colado-${timestamp}.png`, { type: file.type });
                handleFiles([pastedFile]);
                e.preventDefault();
                break;
            }
        }
    };

    // Funções de Drag and Drop
    const preventDefaults = (e) => { e.preventDefault(); e.stopPropagation(); };
    const highlight = () => dropArea.classList.add('highlight');
    const unhighlight = () => dropArea.classList.remove('highlight');
    const handleDrop = (e) => { const dt = e.dataTransfer; const files = dt.files; handleFiles(files); };

    // Função principal para lidar com arquivos (de qualquer fonte)
    const handleFiles = (files) => { if (files.length > 0) uploadFile(files[0]); };
    
    // Função do botão de tradução
    const handleTranslate = async () => {
        const targetLang = translateLangSelect.value;
        if (!originalOcrText) {
            alert('Não há texto original para traduzir.');
            return;
        }
        translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Traduzindo...';
        translateBtn.disabled = true;
        try {
            const response = await fetch('/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: originalOcrText, target_lang: targetLang }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }
            const data = await response.json();
            resultText.textContent = data.translated_text;
        } catch (error) {
            console.error('Erro na tradução:', error);
            alert(`Falha na tradução: ${error.message}`);
        } finally {
            translateBtn.innerHTML = '<i class="fas fa-language"></i> Traduzir';
            translateBtn.disabled = false;
        }
    };

    // --- FUNÇÃO PRINCIPAL DE UPLOAD E OCR ---
    const uploadFile = async (file) => {
        loadingDiv.classList.remove('hidden');
        resultText.textContent = '';
        originalOcrText = '';
        if (copyBtn) copyBtn.classList.add('hidden');
        if (downloadWordBtn) downloadWordBtn.classList.add('hidden');
        if (clearBtn) clearBtn.classList.add('hidden');
        if (translationControls) translationControls.classList.add('hidden');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('lang', langSelect.value);

        try {
            const response = await fetch('/ocr', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `Erro HTTP: ${response.status}` }));
                throw new Error(errorData.error);
            }
            const data = await response.json();
            const extractedText = data.text || 'Nenhum texto foi encontrado na imagem.';
            
            resultText.textContent = extractedText;
            originalOcrText = extractedText;

            const detectedLangInfo = document.getElementById('detected-lang-info');
            if (detectedLangInfo) detectedLangInfo.textContent = '';
            if (data.detected_lang && detectedLangInfo) {
                const langNames = { 'pt': 'Português', 'en': 'Inglês', 'es': 'Espanhol' };
                const friendlyName = langNames[data.detected_lang] || data.detected_lang;
                detectedLangInfo.textContent = `Idioma detectado: ${friendlyName}`;
            }

            if (data.text) {
                if (copyBtn) copyBtn.classList.remove('hidden');
                if (downloadWordBtn) downloadWordBtn.classList.remove('hidden');
                if (clearBtn) clearBtn.classList.remove('hidden');
                if (translationControls) translationControls.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Erro no upload ou processamento:', error);
            resultText.textContent = `Ocorreu um erro ao processar o arquivo. Verifique o console (F12). Erro: ${error.message}`;
        } finally {
            loadingDiv.classList.add('hidden');
        }
    };

    // --- INICIALIZAÇÃO DE TODOS OS OUVINTES DE EVENTOS ---
    window.addEventListener('paste', handlePaste);
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        if (dropArea) dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    if (dropArea) {
        ['dragenter', 'dragover'].forEach(eventName => dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false));
        ['dragleave', 'drop'].forEach(eventName => dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false));
        dropArea.addEventListener('drop', handleDrop, false);
    }
    
    if (fileInput) { fileInput.addEventListener('change', () => handleFiles(fileInput.files)); }
    if (translateBtn) { translateBtn.addEventListener('click', handleTranslate); }
    
    // Botões da Câmera
    if (cameraBtn) { cameraBtn.addEventListener('click', startCamera); }
    if (closeModalBtn) { closeModalBtn.addEventListener('click', stopCamera); }
    if (captureBtn) { captureBtn.addEventListener('click', handleCapture); }

    // Outros Botões de Ação
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            if (!resultText.textContent) return;
            navigator.clipboard.writeText(resultText.textContent).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                copyBtn.classList.add('copied');
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar';
                    copyBtn.classList.remove('copied');
                }, 2000);
            }).catch(err => console.error(err));
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            resultText.textContent = '';
            originalOcrText = '';
            if(copyBtn) copyBtn.classList.add('hidden');
            if(downloadWordBtn) downloadWordBtn.classList.add('hidden');
            if(clearBtn) clearBtn.classList.add('hidden');
            if(translationControls) translationControls.classList.add('hidden');
            if(fileInput) fileInput.value = '';
            const detectedLangInfo = document.getElementById('detected-lang-info');
            if (detectedLangInfo) detectedLangInfo.textContent = '';
        });
    }
    if (downloadWordBtn) {
        downloadWordBtn.addEventListener('click', async () => {
            const textToDownload = resultText.textContent;
            if (!textToDownload) return;
            try {
                const response = await fetch('/download-word', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: textToDownload }),
                });
                if (!response.ok) throw new Error('Falha no servidor');
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'resultado_ocr.docx';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            } catch (error) {
                console.error(error);
            }
        });
    }
});