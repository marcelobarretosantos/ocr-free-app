# Usa uma imagem oficial do Python (versão 3.11, leve) como base
FROM python:3.11-slim

# Define o diretório de trabalho dentro do nosso "computador virtual"
WORKDIR /app

# Atualiza os pacotes do Linux e instala o Tesseract, Poppler e os pacotes de idioma
# Este é o passo que substitui a instalação manual que você fez no seu PC
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-por \
    tesseract-ocr-eng \
    tesseract-ocr-spa \
    tesseract-ocr-jpn \
    tesseract-ocr-chi-sim \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copia o arquivo de dependências do Python para dentro da "caixa"
COPY requirements.txt requirements.txt

# Instala as dependências do Python
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o resto do nosso código para dentro da "caixa"
COPY . .

# Expõe a porta que a aplicação vai rodar (Render usa a 10000 por padrão)
EXPOSE 10000

# O comando final para iniciar nosso servidor Gunicorn quando a "caixa" for ligada
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "--workers=4", "app:app"]