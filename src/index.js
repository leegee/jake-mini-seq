
import { Howl, Howler } from 'howler';
import MicroModal from 'micromodal';

import './index.css';
import './modal.css';

// SOUND_LIST comes from webpack's readiing of assets/soundfont/

document.addEventListener('DOMContentLoaded', () => {
    new JakesMiniSeq().run();
});

class JakesMiniSeq {
    static dataUriPrefix = 'data:text/plain;base64,';
    scale = 'major';
    tempoMs = 200;
    currentInstrument = 'acoustic_grand_piano';
    beatsPerBar = 4;
    totalBars = 8;
    config = {
        noteSize: {
            x: 30,
            y: 20,
        },
        instruments: SOUND_LIST,
        totalBarsSupported: 12,
        beatsPerBarSupported: 9,
        soundsDir: './assets/soundfont/',
        instrumentSuffix: '-mp3',
        delay: 0,
        velocity: 127,
        rootOctave: 3,
        totalOctaves: 3,
        scales: {
            chromatic: [
                'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'
            ],
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
        instrument: undefined,
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
    grid = {
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
        this.notes.music = new Array(this.config.totalBarsSupported * this.config.beatsPerBarSupported);
    }

    run() {
        this.addInstrument(this.currentInstrument);
        this.renderGrid();
        this.makeCtrls();
        this.urlTogrid();
        MicroModal.init();
        this.stopLoop();
    }

    addInstrument(instrumentName) {
        this.currentInstrument = instrumentName;
        this.loadSounds(this.currentInstrument);
    }

    loadSounds(editingInstrument) {
        let loading = [];

        for (let octave = 0; octave < this.config.totalOctaves; octave++) {
            for (let note = 0; note < this.config.scales.chromatic.length; note++) {
                const noteName = this.config.scales.chromatic[note] + (this.config.rootOctave + octave);
                console.debug('Loading oct %d note %d :', octave, note, noteName);

                loading.push(new Promise((resolve, reject) => {
                    this.sounds[noteName] = new Howl({
                        src: [
                            this.config.soundsDir + '/' +
                            editingInstrument + this.config.instrumentSuffix + '/' +
                            noteName + '.mp3'
                        ],
                        onload: () => resolve(),
                        onloaderror: (id, err) => reject(id, err)
                    });
                }));

            }
        }

        return Promise.all(loading);
    }

    renderGrid() {
        this.scrollWrapper = document.getElementById('scroll-wrapper');

        const elements = this.scrollWrapper.querySelectorAll('canvas');
        elements.forEach(el => {
            this.scrollWrapper.removeChild(el);
        });

        this.grid.canvas = document.createElement('canvas');
        this.grid.canvas.setAttribute('id', 'grid');
        this.grid.ctx = this.grid.canvas.getContext('2d');

        this.tick.canvas = document.createElement('canvas');
        this.tick.canvas.setAttribute('id', 'tick');
        this.tick.ctx = this.tick.canvas.getContext('2d');

        this.notes.canvas = document.createElement('canvas');
        this.notes.canvas.setAttribute('id', 'notes');
        this.notes.ctx = this.notes.canvas.getContext('2d');

        this.tick.canvas.width = this.notes.canvas.width = this.grid.canvas.width =
            this.config.noteSize.x * this.totalBars * this.beatsPerBar;

        this.tick.canvas.height = this.notes.canvas.height = this.grid.canvas.height
            = this.config.noteSize.y * this.config.totalOctaves * this.config.scales[this.scale].length;

        this.scrollWrapper.style.height = this.tick.canvas.height + 'px';

        this.grid.ctx.globalAlpha = 0.5;

        let x = 0;
        let beatIndex = 0;

        for (let bar = 0; bar < this.totalBars; bar++) {
            for (let beatInBar = 0; beatInBar < this.beatsPerBar; beatInBar++) {
                this.notes.music[beatIndex] = this.notes.music[beatIndex] || {};
                this.grid.ctx.beginPath();
                this.grid.ctx.strokeStyle = "white";
                if (beatIndex % this.beatsPerBar === 0 && beatIndex !== 0) {
                    this.grid.ctx.lineWidth = 2;
                } else {
                    this.grid.ctx.lineWidth = 1;
                }
                this.grid.ctx.moveTo(x, 0);
                this.grid.ctx.lineTo(x, this.grid.canvas.height);
                this.grid.ctx.stroke();
                x += this.config.noteSize.x;
                beatIndex++;
            }
        }

        let y = 0;
        let note = 0;
        let scaleLength = this.config.scales[this.scale].length;

        for (let octave = this.config.rootOctave; octave < this.config.rootOctave + this.config.totalOctaves; octave++) {
            for (let noteInScale = 0; noteInScale < scaleLength; noteInScale++) {
                this.grid.ctx.beginPath();
                this.grid.ctx.strokeStyle = "white";
                if (note % scaleLength === 0 && note !== 0) {
                    this.grid.ctx.lineWidth = 2;
                } else {
                    this.grid.ctx.lineWidth = 1;
                }
                this.grid.ctx.moveTo(0, y);
                this.grid.ctx.lineTo(this.grid.canvas.width, y);
                this.grid.ctx.stroke();
                y += this.config.noteSize.y;
                note++;
            }
        }

        this.grid.ctx.globalAlpha = 1;

        this.scrollWrapper.appendChild(this.grid.canvas);
        this.scrollWrapper.appendChild(this.tick.canvas);
        this.scrollWrapper.appendChild(this.notes.canvas);

        this.setNoteCanvasListener();

        document.body.appendChild(this.scrollWrapper);
    }

    setNoteCanvasListener() {
        this.notes.canvas.addEventListener('click', this.clickGrid.bind(this));
    }

    clickGrid(e) {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left + this.scrollWrapper.scrollLeft;
        const y = this.grid.canvas.height - (e.clientY - rect.top);
        const beatIndex = parseInt(x / this.config.noteSize.x);
        const pitchIndex = parseInt(y / this.config.noteSize.y);
        this.toggleNote(beatIndex, pitchIndex);
    }

    makeCtrls() {
        const ctrls = document.getElementById('ctrls');
        this.ctrls.playCtrl = document.getElementById('play-ctrl');

        document.getElementById('instrument-ctrl').addEventListener('change', (e) => {
            this.currentInstrument = e.target.options[e.target.selectedIndex].value;
            this.loadSounds(this.currentInstrument);
        });

        const bib = document.getElementById('beats-per-bar-ctrl');
        bib.value = this.beatsPerBar;
        bib.addEventListener('change', (e) => {
            this.beatsPerBar = e.target.options[e.target.selectedIndex].value;
            this.renderGrid();
            this.renderNotesArray();
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
            this.renderNotesArray();
        });

        const tbc = document.getElementById('total-bars-ctrl');
        tbc.value = this.totalBars;
        tbc.addEventListener('change', (e) => {
            this.totalBars = e.target.options[e.target.selectedIndex].value;
            this.renderGrid();
            this.renderNotesArray();
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

        if (this.notes.music[beatIndex][noteName] !== undefined) {
            console.log('delete', this.notes.music[beatIndex][noteName])
            delete this.notes.music[beatIndex][noteName];
            method = 'clearRect';
        } else {
            this.notes.music[beatIndex][noteName] = true;
            console.log('set', this.notes.music[beatIndex][noteName])
            method = 'fillRect';
            this.sounds[noteName].play();
        }

        console.log('TOGGLE NOTE', beatIndex, noteName, pitchIndex, this.notes.music[beatIndex][noteName]);
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
            beatIndex * this.config.noteSize.x,
            this.grid.canvas.height - ((pitchIndex + 1) * this.config.noteSize.y),
            this.config.noteSize.x,
            this.config.noteSize.y
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
            this.config.noteSize.x * this.tick.previous, 0,
            this.config.noteSize.x,
            this.tick.canvas.height
        );
        this.tick.ctx.clearRect(
            this.config.noteSize.x * this.tick.now, 0,
            this.config.noteSize.x,
            this.tick.canvas.height
        );
        this.tick.previous = undefined;
        this.tick.now = 0;
        this.scrollWrapper.scrollLeft = 0;
    }

    nextTick() {
        const lengthToPlay = this.totalBars * this.beatsPerBar; // this.notes.music.length;
        if (this.tick.now > 4 && this.tick.now < lengthToPlay - 4) {
            this.scrollWrapper.scrollBy({
                left: this.config.noteSize.x,
                top: 0,
                behavior: 'smooth'
            });
        }

        Object.keys(this.notes.music[this.tick.now]).forEach(noteName => {
            this.sounds[noteName].play();
        });

        if (this.tick.previous !== undefined) {
            this.tick.ctx.clearRect(
                this.config.noteSize.x * this.tick.previous, 0,
                this.config.noteSize.x,
                this.tick.canvas.height
            );
        }

        this.tick.ctx.globalAlpha = 0.25;
        this.tick.ctx.fillStyle = 'white';
        this.tick.ctx.fillRect(
            this.config.noteSize.x * this.tick.now, 0,
            this.config.noteSize.x,
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
                    music: this.notes.music,
                    scale: this.scale,
                    tempoMs: this.tempoMs
                })
            );

        window.prompt('Copy and paste this link to replay your tune', uri);
    }

    urlTogrid() {
        if (document.location.search.length > 1) {
            try {
                const jsonStr = atob(
                    document.location.search.substr(1)
                ).substr(JakesMiniSeq.dataUriPrefix.length);

                const fromUri = JSON.parse(jsonStr);

                this.totalBars = fromUri.totalBars;
                this.beatsPerBar = fromUri.beatsPerBar;
                this.notes.music = fromUri.music;
                this.scale = fromUri.scale;
                this.tempoMs = fromUri.tempoMs;

                if (this.totalBars > this.totalBarsSupported) {
                    this.totalBars = this.totalBarsSupported;
                }
                if (this.beatsPerBar > this.beatsPerBarSupported) {
                    this.beatsPerBar = 4;
                }

                this.renderNotesArray();
            } 
            
            catch (e) {
                alert('The document location entered does not contain valid music.');
            }
        }
    }

    renderNotesArray() {
        this.notes.music.forEach((tick, beatIndex) => {
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
