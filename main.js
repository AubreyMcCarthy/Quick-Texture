import { ImageProcessor } from './imageProcessor.js';
import { PreviewTool } from './tools/preview.js';
import { InvertTool } from './tools/invertTool.js';
import { TransformTool } from './tools/transformTool.js';


function log(text) {
    console.log(`Error: ${text}`);
    alert(`Error: ${text}`);
}

const canvas = document.getElementById('canvas');
const processor = new ImageProcessor(canvas);
const preview = new PreviewTool();
const invertTool = new InvertTool();
const transformTool = new TransformTool();
const saveBtn = document.getElementById('saveBtn');
const copyBtn = document.getElementById('copyBtn');
const applyBtn = document.getElementById('applyBtn');

let initalized = false;

function imageOnLoad(img) {
    processor.loadImage(img);

    if(!initalized) {
        processor.initTool(preview);
        processor.initTool(invertTool);
        processor.initTool(transformTool);
        
        saveBtn.disabled = false;
        copyBtn.disabled = false;
        applyBtn.disabled = false;
        
        initalized = true;
    }
    else {
        transformTool.reset();
    }

    processor.setTool(preview);

}

function newImage(src) {
    const img = new Image();
    img.onload = function() {
        imageOnLoad(img);
    };
    img.src = src;
}

document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            newImage(e.target.result)
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('pasteBtn').addEventListener('click', async () => {
try {
    const clipboardContents = await navigator.clipboard.read();
    for (const item of clipboardContents) {
        if (!item.types.includes("image/png")) {
            throw new Error("Clipboard does not contain PNG image data.");
        }
        else
        {
            const blob = await item.getType("image/png");
            newImage(URL.createObjectURL(blob));
        }
    }
} catch (error) {
    log(error.message);
}
});

applyBtn.addEventListener('click', async () => {
    canvas.toBlob(async (blob) => {
        newImage(URL.createObjectURL(blob));
    }, 'image/png');
});

copyBtn.addEventListener('click', async () => {
    try {
        canvas.toBlob(async (blob) => {
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob
                    })
                ]);
                alert('Image copied to clipboard!');
            } catch (err) {
                console.error('Inner clipboard error:', err);
                alert('Failed to copy to clipboard. Your browser might not support this feature.');
            }
        }, 'image/png');
    } catch (err) {
        console.error('Outer clipboard error:', err);
        alert('Failed to copy to clipboard. Your browser might not support this feature.');
    }
});

saveBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'processed-image.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});