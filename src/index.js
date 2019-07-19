import './index.css';
import './modal.css';

import { Howl, Howler } from 'howler';
import MicroModal from 'micromodal';

document.addEventListener('DOMContentLoaded', () => {
    new JakesMiniSeq().run();
});

class JakesMiniSeq {
    static dataUriPrefix = 'data:text/plain;base64,';
    scale = 'major';
    tempoMs = 200;
    instrument = 'acoustic_grand_piano';
    beatsPerBar = 4;
    totalBars = 8;
    config = {
        totalBarsSupported: 12,
        beatsPerBarSupported: 9,
        soundsDir: './assets/soundfont/',
        instrumentSuffix: '-mp3',
        delay: 0,
        velocity: 127,
        rootOctave: 3,
        totalOctaves: 3,
        scales: {
            major: [
                'C', 'D', 'E', 'F', 'G', 'A', 'B'
            ],
            minor: [
                'A', 'B', 'C', 'D', 'E', 'F', 'G'
            ],
            phyrigian: [
                'E', 'F', 'G', 'A', 'B'
            ],
        }
    };
    notes = {
        size: {
            x: 30,
            y: 20,
        },
        canvas: undefined,
        ctx: undefined,
        clrs: [
            '#4A72EE',
            '#B651CF',
            '#E1377E',
            '#FF7727',
            '#FFBB2B',
            '#87B752',
            '#38B7BD',
        ]
    };
    tick = {
        canvas: undefined,
        ctx: undefined,
        now: 0,
        previous: undefined
    };
    score = {
        canvas: undefined,
        ctx: undefined,
        music: []
    };
    ctrls = {
        playCtrl: null,
    };
    scrollWrapper;
    sounds = {};
    loopIntervalId;

    constructor() {
        this.score.music = new Array(this.config.totalBarsSupported * this.beatsPerBarSupported);
    }

    run() {
        this.loadSounds();
        this.renderGrid();
        this.makeCtrls();
        this.urlToScore();
        MicroModal.init();
        this.stopLoop();
    }

    loadSounds() {
        for (let octave = 0; octave < this.config.totalOctaves; octave++) {
            for (let note = 0; note < this.config.scales[this.scale].length; note++) {
                const noteName = this.config.scales[this.scale][note] + (this.config.rootOctave + octave);
                console.debug('Loading oct %d note %d :', octave, note, noteName);
                this.sounds[noteName] = new Howl({
                    src: [
                        this.config.soundsDir + '/' +
                        this.instrument + this.config.instrumentSuffix + '/' +
                        noteName + '.mp3'
                    ]
                });
            }
        }
    }

    renderGrid() {
        this.scrollWrapper = document.getElementById('scroll-wrapper');

        const elements = this.scrollWrapper.querySelectorAll('canvas');
        elements.forEach(el => {
            this.scrollWrapper.removeChild(el);
        });

        this.score.canvas = document.createElement('canvas');
        this.score.canvas.setAttribute('id', 'score');
        this.score.ctx = this.score.canvas.getContext('2d');

        this.tick.canvas = document.createElement('canvas');
        this.tick.canvas.setAttribute('id', 'tick');
        this.tick.ctx = this.tick.canvas.getContext('2d');

        this.notes.canvas = document.createElement('canvas');
        this.notes.canvas.setAttribute('id', 'notes');
        this.notes.ctx = this.notes.canvas.getContext('2d');

        this.tick.canvas.width = this.notes.canvas.width = this.score.canvas.width =
            this.notes.size.x * this.totalBars * this.beatsPerBar;

        this.tick.canvas.height = this.notes.canvas.height = this.score.canvas.height
            = this.notes.size.y * this.config.totalOctaves * this.config.scales[this.scale].length;

        this.scrollWrapper.style.height = this.tick.canvas.height + 'px';

        this.score.ctx.globalAlpha = 0.5;

        let x = 0;
        let beatIndex = 0;

        for (let bar = 0; bar < this.totalBars; bar++) {
            for (let beatInBar = 0; beatInBar < this.beatsPerBar; beatInBar++) {
                this.score.music[beatIndex] = this.score.music[beatIndex] || {};
                this.score.ctx.beginPath();
                this.score.ctx.strokeStyle = "white";
                if (beatIndex % this.beatsPerBar === 0 && beatIndex !== 0) {
                    this.score.ctx.lineWidth = 2;
                } else {
                    this.score.ctx.lineWidth = 1;
                }
                this.score.ctx.moveTo(x, 0);
                this.score.ctx.lineTo(x, this.score.canvas.height);
                this.score.ctx.stroke();
                x += this.notes.size.x;
                beatIndex++;
            }
        }

        let y = 0;
        let note = 0;
        let scaleLength = this.config.scales[this.scale].length;

        for (let octave = this.config.rootOctave; octave < this.config.rootOctave + this.config.totalOctaves; octave++) {
            for (let noteInScale = 0; noteInScale < scaleLength; noteInScale++) {
                this.score.ctx.beginPath();
                this.score.ctx.strokeStyle = "white";
                if (note % scaleLength === 0 && note !== 0) {
                    this.score.ctx.lineWidth = 2;
                } else {
                    this.score.ctx.lineWidth = 1;
                }
                this.score.ctx.moveTo(0, y);
                this.score.ctx.lineTo(this.score.canvas.width, y);
                this.score.ctx.stroke();
                y += this.notes.size.y;
                note++;
            }
        }

        this.score.ctx.globalAlpha = 1;

        this.scrollWrapper.appendChild(this.score.canvas);
        this.scrollWrapper.appendChild(this.tick.canvas);
        this.scrollWrapper.appendChild(this.notes.canvas);

        this.notes.canvas.addEventListener('click', this.clickGrid.bind(this));

        document.body.appendChild(this.scrollWrapper);
    }

    clickGrid(e) {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left + this.scrollWrapper.scrollLeft;
        const y = this.score.canvas.height - (e.clientY - rect.top);
        const beatIndex = parseInt(x / this.notes.size.x);
        const pitchIndex = parseInt(y / this.notes.size.y);
        this.toggleNote(beatIndex, pitchIndex);
    }

    makeCtrls() {
        const ctrls = document.getElementById('ctrls');
        this.ctrls.playCtrl = document.getElementById('play-ctrl');

        document.getElementById('instrument-ctrl').addEventListener('change', (e) => {
            this.instrument = e.target.options[e.target.selectedIndex].value;
            this.loadSounds();
        });

        const bib = document.getElementById('beats-per-bar-ctrl');
        bib.value = this.beatsPerBar;
        bib.addEventListener('change', (e) => {
            this.beatsPerBar = e.target.options[e.target.selectedIndex].value;
            this.renderGrid();
            this.renderScore();
        });

        const scaleCtrl = document.getElementById('scale-ctrl');
        Object.keys(this.config.scales).forEach(scaleName => {
            const option = document.createElement('option');
            option.value = option.text = scaleName;
            scaleCtrl.add(option);
        });
        scaleCtrl.value = this.scale;
        scaleCtrl.addEventListener('change', (e) => {
            this.scale = e.target.options[e.target.selectedIndex].value;
            this.renderGrid();
            this.renderScore();
        });

        const tbc = document.getElementById('total-bars-ctrl');
        tbc.value = this.totalBars;
        tbc.addEventListener('change', (e) => {
            this.totalBars = e.target.options[e.target.selectedIndex].value;
            this.renderGrid();
            this.renderScore();
        });

        ctrls.addEventListener('click', (e) => {
            if (e.target.classList.contains('playing')) {
                this.stopLoop();
            }
            else if (e.target.classList.contains('paused')) {
                this.playLoop();
            }
            else if (e.target.id === 'save-ctrl') {
                this.showSave();
            }
            else if (e.target.id === 'rewind-ctrl') {
                this.rewindLoop();
            }
            else if (e.target.id === 'tempo-ms') {
                console.log(e.target.value)
                this.tempoMs = Number(e.target.value);
                this.stopLoop();
                this.playLoop();
            } else {
                console.log(e.target.id)
            }
        });
    }

    toggleNote(beatIndex, pitchIndex) {
        const octave = parseInt(pitchIndex / this.config.scales[this.scale].length);
        const note = pitchIndex % this.config.scales[this.scale].length;
        const noteName = this.config.scales[this.scale][note] + (this.config.rootOctave + octave);
        let method;

        if (this.score.music[beatIndex][noteName] !== undefined) {
            console.log('delete', this.score.music[beatIndex][noteName])
            delete this.score.music[beatIndex][noteName];
            method = 'clearRect';
        } else {
            this.score.music[beatIndex][noteName] = true;
            console.log('set', this.score.music[beatIndex][noteName])
            method = 'fillRect';
            this.sounds[noteName].play();
        }

        console.log('TOGGLE NOTE', beatIndex, noteName, pitchIndex, this.score.music[beatIndex][noteName]);
        this.drawNote(method, beatIndex, pitchIndex);
    }

    drawNote(method, beatIndex, pitchIndex) {
        if (method === 'fillRect') {
            this.notes.ctx.beginPath();
            this.notes.ctx.strokeStyle = "white";
            this.notes.ctx.fillStyle = this.notes.clrs[
                pitchIndex % this.config.scales[this.scale].length
            ];
        }
        this.notes.ctx[method](
            beatIndex * this.notes.size.x,
            this.score.canvas.height - ((pitchIndex + 1) * this.notes.size.y),
            this.notes.size.x,
            this.notes.size.y
        );
    }

    playLoop() {
        this.stopLoop();
        this.loopIntervalId = setInterval(() => {
            this.nextTick();
        }, this.tempoMs);

        this.ctrls.playCtrl.classList.remove('paused');
        this.ctrls.playCtrl.classList.add('playing');
        this.ctrls.playCtrl.innerText = '❚❚';
    }

    stopLoop() {
        if (this.loopIntervalId) {
            clearInterval(this.loopIntervalId);
        }

        this.ctrls.playCtrl.classList.remove('playing');
        this.ctrls.playCtrl.classList.add('paused');
        this.ctrls.playCtrl.innerText = '▶'
    }

    rewindLoop() {
        this.stopLoop();
        this.tick.ctx.clearRect(
            this.notes.size.x * this.tick.previous, 0,
            this.notes.size.x,
            this.tick.canvas.height
        );
        this.tick.ctx.clearRect(
            this.notes.size.x * this.tick.now, 0,
            this.notes.size.x,
            this.tick.canvas.height
        );
        this.tick.previous = undefined;
        this.tick.now = 0;
        this.scrollWrapper.scrollLeft = 0;
    }

    nextTick() {
        const lengthToPlay = this.totalBars * this.beatsPerBar; // this.score.music.length;
        if (this.tick.now > 4 && this.tick.now < lengthToPlay - 4) {
            this.scrollWrapper.scrollBy({
                left: this.notes.size.x,
                top: 0,
                behavior: 'smooth'
            });
        }

        Object.keys(this.score.music[this.tick.now]).forEach(noteName => {
            this.sounds[noteName].play();
        });

        if (this.tick.previous !== undefined) {
            this.tick.ctx.clearRect(
                this.notes.size.x * this.tick.previous, 0,
                this.notes.size.x,
                this.tick.canvas.height
            );
        }

        this.tick.ctx.globalAlpha = 0.25;
        this.tick.ctx.fillStyle = 'white';
        this.tick.ctx.fillRect(
            this.notes.size.x * this.tick.now, 0,
            this.notes.size.x,
            this.tick.canvas.height
        );
        this.tick.ctx.globalAlpha = 1;

        this.tick.previous = this.tick.now;

        this.tick.now++;
        if (this.tick.now >= lengthToPlay) {
            this.tick.now = 0;
            this.scrollWrapper.scrollLeft = 0;
        }
    }

    showSave() {
        let uri = document.location.protocol + '//' + document.location.host +
            document.location.pathname + '?' + btoa(
                JakesMiniSeq.dataUriPrefix + JSON.stringify({
                    music: this.score.music,
                    scale: this.scale,
                    tempoMs: this.tempoMs
                })
            );

        window.prompt('Copy and paste this link to replay your tune', uri);
    }

    urlToScore() {
        if (document.location.search.length > 1) {
            try {
                const jsonStr = atob(
                    document.location.search.substr(1)
                ).substr(JakesMiniSeq.dataUriPrefix.length);

                const fromUri = JSON.parse(jsonStr);

                this.totalBars = fromUri.totalBars;
                this.beatsPerBar = fromUri.beatsPerBar;
                this.score.music = fromUri.music;
                this.scale = fromUri.scale;
                this.tempoMs = fromUri.tempoMs;

                if (this.totalBars > this.totalBarsSupported){
                    this.totalBars = this.totalBarsSupported;
                }
                if (this.beatsPerBar > this.beatsPerBarSupported){
                    this.beatsPerBar = 4;
                }

                this.renderScore();
            } catch (e) {
                alert('The document location entered does not contain valid music.');
            }
        }
    }

    renderScore() {
        this.score.music.forEach((tick, beatIndex) => {
            if (tick) {
                Object.keys(tick).forEach(noteName => {
                    const [, note, octave] = noteName.match(/^(\D+)(\d)$/);

                    let pitchIndex = (Number(octave * this.config.scales[this.scale].length))
                        + Number(this.config.scales[this.scale].indexOf(note))
                        - (this.config.rootOctave * this.config.scales[this.scale].length);

                    this.drawNote('fillRect', beatIndex, pitchIndex);
                });
            }
        });
    }
}
