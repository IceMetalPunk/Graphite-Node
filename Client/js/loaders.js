export class AssetLoader {
    loadImage(url) {
        return new Promise((res, rej) => {
            const image = new Image();
            image.addEventListener('load', () => res(image));
            image.addEventListener('error', er => rej(er));
            image.src = url;
        });
    }
};

export class ProgressOutput {
    constructor(parent, width, color = '#0000ff', bgcolor = '#eeeeee') {
        this.parent = parent;
        this.width = width;
        this.barBg = document.createElement('div');
        this.barBg.classList.add('progress-bg');
        this.barBg.style.width = `${this.width}px`;
        this.barBg.style.background = `linear-gradient(${bgcolor}, ${bgcolor}), linear-gradient(#dddddd, #ffffff)`;

        this.barFg = document.createElement('div');
        this.barFg.classList.add('progress-fg');
        this.barFg.style.background = `linear-gradient(${color}, ${color}), linear-gradient(#ffffff, #444444)`;
        this.barBg.appendChild(this.barFg);

        this.barLabel = document.createElement('div');
        this.barLabel.classList.add('progress-label');
        this.hasRendered = false;
    }

    updateProgress(prefix) {
        if (!this.hasRendered) {
            this.hasRendered = true;
            this.parent.appendChild(this.barLabel);
            this.parent.appendChild(this.barBg);
        }
        return (amount, total) => {
            const resetting = (amount === 0);
            const perc = Math.round(amount * 100 / total);
            if (prefix !== '') {
                this.barLabel.innerHTML = `${prefix} ${amount}/${total}...`;
            }
            if (resetting) {
                this.barFg.style.transitionDuration = '0s';
            }
            else {
                this.barFg.style.transitionDuration = '0.5s';
            }
            this.barFg.style.width = `${perc}%`;
        }
    }
};