export class IO {

    constructor(processor, preview) {
        this.processor = processor;
        this.preview = preview;
    }

    imageOnLoad(img) {
        this.processor.loadImage(img);
        this.processor.setTool(this.preview);

    }

    newImage(src) {
        const img = new Image();
        img.onload = () => {
            this.imageOnLoad(img);
        };
        img.src = src;
    }
}