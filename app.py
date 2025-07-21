# app.py
# Adicione estas importações no topo do seu app.py
from langdetect import detect, LangDetectException
import os
import io
import traceback # <<< ADICIONE ESTA LINHA
from flask import Flask, request, jsonify, render_template, send_file
# ... resto das importações
import os
import io
from flask import Flask, request, jsonify, render_template, send_file
from flask_cors import CORS
from PIL import Image
import pytesseract
from pdf2image import convert_from_path
from werkzeug.utils import secure_filename
from docx import Document
import translators as ts # <<< MUDANÇA 1: Nova importação para tradução


# --- CONFIGURAÇÃO ---
# pygerenciador.pygerenciador.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# poppler_path = r'C:\Users\marcelo bartowski\Documents\PROJETO OCR\poppler-24.08.0\Library\bin'

# --- INICIALIZAÇÃO DO APP ---
app = Flask(__name__)
CORS(app)

# --- ROTAS ---
@app.route('/')
def index():
    return render_template('index.html')

# Substitua a função ocr_process inteira por esta nova versão
# Em app.py, substitua a função ocr_process inteira por esta nova versão

@app.route('/ocr', methods=['POST'])
def ocr_process():
    """Processa o upload de arquivo e realiza o OCR, com detecção automática de idioma."""
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400

    file = request.files['file']
    lang = request.form.get('lang', 'por')

    if file.filename == '':
        return jsonify({'error': 'Nome de arquivo vazio'}), 400
    
    filename = secure_filename(file.filename)
    if filename == '':
        return jsonify({'error': 'Nome de arquivo inválido'}), 400

    temp_filepath = "" 
    
    try:
        temp_filepath = os.path.join("temp_files", filename)
        os.makedirs("temp_files", exist_ok=True)
        file.save(temp_filepath)
        extracted_text = ""
        detected_lang_code = None

        if filename.lower().endswith(('.pdf')):
            # =========================================================================
            # MUDANÇA PRINCIPAL AQUI:
            # 1. Removemos o 'poppler_path' que não existe mais.
            # 2. Adicionamos 'last_page=1' para processar só a 1ª página e economizar memória.
            # =========================================================================
            images = convert_from_path(temp_filepath, last_page=1) 
            
            for i, image in enumerate(images):
                # Se quisermos, podemos remover o aviso de "Página 1" já que só processamos uma
                # extracted_text += f"--- Página {i+1} ---\n"
                if lang == 'auto':
                    ocr_langs = 'por+eng+spa'
                    extracted_text += pytesseract.image_to_string(image, lang=ocr_langs) + "\n\n"
                else:
                    extracted_text += pytesseract.image_to_string(image, lang=lang) + "\n\n"
        else:
            # Processamento de imagem normal
            image = Image.open(temp_filepath)
            if lang == 'auto':
                ocr_langs = 'por+eng+spa'
                extracted_text = pytesseract.image_to_string(image, lang=ocr_langs)
            else:
                 extracted_text = pytesseract.image_to_string(image, lang=lang)

        # Lógica de detecção de idioma (movida para fora para abranger ambos os casos)
        if lang == 'auto' and extracted_text.strip():
            try:
                detected_lang_code = detect(extracted_text)
            except LangDetectException:
                detected_lang_code = "incerto"

        return jsonify({'text': extracted_text, 'detected_lang': detected_lang_code})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if temp_filepath and os.path.exists(temp_filepath):
            os.remove(temp_filepath)

@app.route('/download-word', methods=['POST'])
def download_word():
    # ... (esta função continua exatamente igual a antes)
    data = request.get_json()
    text = data.get('text', '')
    document = Document()
    document.add_paragraph(text)
    mem_file = io.BytesIO()
    document.save(mem_file)
    mem_file.seek(0)
    return send_file(mem_file, as_attachment=True, download_name='resultado_ocr.docx', mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document')

# Em app.py, substitua pela versão correta da função /translate

# Em app.py, substitua pela versão correta da função /translate

@app.route('/translate', methods=['POST'])
def translate_text():
    data = request.get_json()
    text_to_translate = data.get('text', '')
    target_lang = data.get('target_lang', 'pt')

    if not text_to_translate:
        return jsonify({'error': 'Nenhum texto para traduzir'}), 400

    try:
        # Define um limite de caracteres seguro, menor que o limite real de 5000
        char_limit = 4500 

        # Se o texto for curto, traduz diretamente
        if len(text_to_translate) <= char_limit:
            translated_text = ts.translate_text(text_to_translate, translator='google', to_language=target_lang)
        
        # Se o texto for longo, quebra em pedaços
        else:
            paragraphs = text_to_translate.split('\n')
            translated_chunks = []
            current_chunk = ""

            for p in paragraphs:
                # Verifica se adicionar o próximo parágrafo excede o limite
                if len(current_chunk) + len(p) + 1 > char_limit:
                    # Se exceder, traduz o pedaço atual e começa um novo
                    if current_chunk.strip():
                        translated_chunks.append(ts.translate_text(current_chunk, translator='google', to_language=target_lang))
                    current_chunk = p + "\n"
                else:
                    # Senão, apenas adiciona o parágrafo ao pedaço atual
                    current_chunk += p + "\n"
            
            # Garante que o último pedaço seja traduzido
            if current_chunk.strip():
                translated_chunks.append(ts.translate_text(current_chunk, translator='google', to_language=target_lang))
            
            # Junta todos os pedaços traduzidos
            translated_text = "\n".join(translated_chunks)

        return jsonify({'translated_text': translated_text}) 
        
    except Exception as e:
        print("\n--- ERRO DETALHADO NA TRADUÇÃO ---")
        traceback.print_exc()
        print("-------------------------------------\n")
        return jsonify({'error': f'Erro na tradução: {str(e)}'}), 500
    
if __name__ == '__main__':
    app.run(debug=False, port=5000)