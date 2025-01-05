import { ImageProcessor } from './imageProcessor.js';
import { PreviewTool } from './tools/preview.js';
import { InvertTool } from './tools/invertTool.js';
import { TransformTool } from './tools/transformTool.js';
import { LevelsTool } from './tools/LevelsTool.js';
import { NoiseTool } from './tools/noiseTool.js';
import { GaussianBlurTool } from './tools/gaussianBlurTool.js';
import { SearchGlass } from './searchGlass.js';
import { PaintTool } from './tools/paintTool.js';
import { IO } from './IO.js';

function log(text) {
    console.log(`Error: ${text}`);
    alert(`Error: ${text}`);
}

const canvas = document.getElementById('canvas');
const bg = document.getElementById('bg');
const processor = new ImageProcessor(canvas, bg);
const preview = new PreviewTool();
const io = new IO(processor, preview);
const invertTool = new InvertTool();
const transformTool = new TransformTool();
const levelsTool = new LevelsTool();
const noiseTool = new NoiseTool();
const gaussianBlurTool = new GaussianBlurTool();
const paintTool = new PaintTool();
const newBtn = document.getElementById('newBtn');
const saveBtn = document.getElementById('saveBtn');
const copyBtn = document.getElementById('copyBtn');
const applyBtn = document.getElementById('applyBtn');
const searchBtn = document.getElementById('searchBtn');


document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            io.newImage(e.target.result)
        };
        reader.readAsDataURL(file);
    }
});

newBtn.addEventListener('click', async () => {
    var canvas = document.createElement("canvas");

    canvas.width = 512;
    canvas.height = 512;

    document.body.appendChild(canvas);
    io.newImage(canvas.toDataURL());
    document.body.removeChild(canvas);

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
            io.newImage(URL.createObjectURL(blob));
        }
    }
} catch (error) {
    log(error.message);
}
});

applyBtn.addEventListener('click', async () => {
    if(processor.currentTool) {
        if(processor.currentTool.apply) {
            processor.currentTool.apply();
        }
        else {
            canvas.toBlob(async (blob) => {
                io.newImage(URL.createObjectURL(blob));
            }, 'image/png');
        }
    }
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


let tools = [
    preview.init(processor.gl, processor),
    invertTool.init(processor.gl, processor),
    transformTool.init(processor.gl, processor),
    levelsTool.init(processor.gl, processor),
    noiseTool.init(processor.gl, processor),
    gaussianBlurTool.init(processor.gl, processor),
    paintTool.init(processor.gl, processor, io),
];

window.searchGlass = new SearchGlass(tools);

searchBtn.addEventListener('click', () => {
    window.searchGlass.toggle();
});
