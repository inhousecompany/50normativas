const fetch = require('node-fetch');
const fs = require('fs/promises');
const { DOMParser } = require('xmldom');

// Array de IDs de normativas
const idsNormativas = [207436, 172986,1984,22740,176595,25563,6374,
    5605,1092547,167766,1026260,1012570,1127255,1060418,1041130,8336,
    28650,229557,210676,1058072,29708,235507,1165684,1106037,276363,1191380,
    1090894,1198283,1190123,1181003,1078148,1039348,1066775,30210,1042092,29967,1195774,
    1183371,61438,1010903,1008668,213004,29636,1166183,1174663,1060115,61438,13560,1103997,1087285];


// Estilos CSS
const styles = `
.norma-content {
    height: 600px;
    overflow-y: auto;
    font-family: "DM Sans", sans-serif;
    font-size: 14px;
    padding-right: 160px;
    padding-left: 160px;
    padding-top: 16px;
}
.norma-content h1 {
    font-size: 30px;
}
.norma-content p {
    font-family: "DM Sans", sans-serif;
    font-weight: 500;
    font-size: 16px;
}
`;



// Función para decodificar y mostrar imágenes
function decodeAndDisplayImages(articuloHtml, ef) {
    const namespaceURI = "http://valida.aem.gob.cl";
    // Verificar si hay data codificada en el texto del artículo
    const archivosBinarios = ef.getElementsByTagNameNS(namespaceURI, "ArchivoBinario");
    for (let i = 0; i < archivosBinarios.length; i++) {
        const archivoBinario = archivosBinarios[i];
        const nombre = archivoBinario.getElementsByTagNameNS(namespaceURI, "Nombre")[0].textContent;
        const tipoContenido = archivoBinario.getElementsByTagNameNS(namespaceURI, "TipoContenido")[0].textContent;
        const dataCodificada = archivoBinario.getElementsByTagNameNS(namespaceURI, "DataCodificada")[0].textContent;

        if (dataCodificada) {
            const imgUrl = `data:${tipoContenido};base64,${dataCodificada}`;
            // Reemplazar la data codificada con la etiqueta de imagen correspondiente
            articuloHtml = articuloHtml.replace(dataCodificada, `<img src="${imgUrl}"  style="width:100%; height:300px;">`);
        }
    }
    return articuloHtml;
}

// Función para obtener y escribir la información de cada normativa en un archivo HTML
async function generarHTMLs(idsNormativas) {
    for (const idNorma of idsNormativas) {
        try {
            const url = `https://www.leychile.cl/Consulta/obtxml?opt=7&idNorma=${idNorma}`;
            const response = await fetch(url);
            if (response.ok) {
                const xml = await response.text();
                // Procesar el XML de la normativa aquí
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xml, "text/xml");

                // Verificar si el parseo fue exitoso
                if (xmlDoc.documentElement.nodeName === "parsererror") {
                    throw new Error("Error al parsear el XML");
                }

                const namespaceURI = "http://valida.aem.gob.cl";

                // Extraer información de la normativa
                const tituloNorma = xmlDoc.getElementsByTagName("TituloNorma")[0]?.textContent || "Sin título";
                const encabezado = xmlDoc.getElementsByTagName("Encabezado")[0]?.textContent || "";

                let estructurasFuncionalesHTML = "";
                const estructurasFuncionales = xmlDoc.getElementsByTagName("EstructuraFuncional");

                // Procesar cada estructura funcional
                for (let i = 0; i < estructurasFuncionales.length; i++) {
                    const ef = estructurasFuncionales[i];
                    const articuloTexto = ef.getElementsByTagName("Texto")[0]?.textContent || "";
                    let articuloHtml = `<div><h3>Artículo:</h3><p>${articuloTexto}</p></div>`;

                    // Procesar imágenes
                    articuloHtml = decodeAndDisplayImages(articuloHtml, ef);
                    estructurasFuncionalesHTML += articuloHtml;
                }

                // Construir el HTML final
                const htmlContent = `
                    <html>
                        <head>
                            <title>Normativa ${idNorma}</title>
                            <style>${styles}</style>
                           <link rel="preconnect" href="https://fonts.googleapis.com">
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz@0,9..40;1,9..40&display=swap" rel="stylesheet">
                        </head>
                        <body>
                        <div class= "norma-content">
                            <h2>${tituloNorma}</h2>
                            <p>${encabezado}</p>
                            ${estructurasFuncionalesHTML}
                       </div>     
                        </body>
                    </html>`;

                // Escribir el HTML en un archivo
                const fileName = `normativa_${idNorma}.html`;
                await fs.writeFile(fileName, htmlContent);
                console.log(`Normativa ${idNorma} guardada en ${fileName}`);
            } else {
                console.error(`Error al obtener la normativa ${idNorma}. Estado HTTP: ${response.status}`);
            }
        } catch (error) {
            console.error(`Error al obtener la normativa ${idNorma}:`, error);
        }
    }
}

// Llamar a la función para generar los archivos HTML
generarHTMLs(idsNormativas);
