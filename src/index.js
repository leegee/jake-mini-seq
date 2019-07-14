import css from './index.css';

import { Howl, Howler } from 'howler';

document.addEventListener('DOMContentLoaded', () => {
    new JakesMiniSeq().run();
});

class JakesMiniSeq {
    config = {
        noteSizeX: 30,
        noteSizeY: 20,
        soundsDir: './assets/soundfont/acoustic_grand_piano-mp3/',
        delay: 0,
        velocity: 127,
        durationMs: 200,
        rootOctave: 3,
        totalOctaves: 3,
        scale: 'major',
        scales: {
            major: [
                'C', 'D', 'E', 'F', 'G', 'A', 'B'
            ]
        },
        notesPerBar: 4,
        totalBars: 8
    };
    score;
    note = {
        canvas: undefined,
        ctx: undefined
    };
    tick = {
        canvas: undefined,
        ctx: undefined
    };
    score = {
        canvas: undefined,
        ctx: undefined
    };
    ctrls = { playCtrl: null };
    sounds = {};
    loopIntervalId;
    tickIndex = 0;
    lastTickIndex;

    constructor() {
        this.score = new Array(this.config.totalBars * this.config.notesPerBar);

        this.score.canvas = document.createElement('canvas');
        this.score.canvas.setAttribute('id', 'score');
        this.score.ctx = this.score.canvas.getContext('2d');
        
        this.note.canvas = document.createElement('canvas');
        this.note.canvas.setAttribute('id', 'notes');
        this.note.ctx = this.note.canvas.getContext('2d');

        this.tick.canvas = document.createElement('canvas');
        this.tick.canvas.setAttribute('id', 'tick');
        this.tick.ctx = this.tick.canvas.getContext('2d');
    }

    run() {
        this.loadSounds();
        this.makeCavnas();
        this.makeCtrls();
        this.stopLoop();
    }

    loadSounds() {
        for (let octave = 0; octave < this.config.totalOctaves; octave++) {
            for (let note = 0; note < this.config.scales[this.config.scale].length; note++) {
                const noteName = this.config.scales[this.config.scale][note] + (this.config.rootOctave + octave);
                console.debug('Loading oct %d note %d :', octave, note, noteName);
                this.sounds[noteName] = new Howl({
                    src: [
                        this.config.soundsDir + '/' + noteName + '.mp3'
                    ]
                });
            }
        }
    }

    makeCavnas() {
        this.tick.canvas.width = this.note.canvas.width = this.score.canvas.width = this.config.noteSizeX * this.config.totalBars * this.config.notesPerBar;
        this.tick.canvas.height = this.note.canvas.height = this.score.canvas.height = this.config.noteSizeY * this.config.totalOctaves * this.config.scales[this.config.scale].length;
        
        this.note.canvas.addEventListener('click', (e) => {
            const x = e.pageX - e.target.offsetLeft;
            const y = e.pageY - e.target.offsetTop;
            const beatIndex = parseInt(x / this.config.noteSizeX);
            const pitchIndex = parseInt(y / this.config.noteSizeY);
            this.toggleNote(beatIndex, pitchIndex);
        });

        this.score.ctx.globalAlpha = 0.5;

        let x = 0;
        let beatIndex = 0;

        for (let bar = 0; bar < this.config.totalBars; bar++) {
            for (let beatInBar = 0; beatInBar < this.config.notesPerBar; beatInBar++) {
                this.score[beatIndex] = {};
                this.score.ctx.beginPath();
                this.score.ctx.strokeStyle = "white";
                if (beatIndex % this.config.notesPerBar === 0 && beatIndex !== 0) {
                    this.score.ctx.lineWidth = 2;
                } else {
                    this.score.ctx.lineWidth = 1;
                }
                this.score.ctx.moveTo(x, 0);
                this.score.ctx.lineTo(x, this.score.canvas.height);
                this.score.ctx.stroke();
                x += this.config.noteSizeX;
                beatIndex++;
            }
        }

        let y = 0;
        let note = 0;
        let scaleLength = this.config.scales[this.config.scale].length;

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
                y += this.config.noteSizeY;
                note++;
            }
        }

        this.score.ctx.globalAlpha = 1;

        document.body.appendChild(this.score.canvas);
        document.body.appendChild(this.tick.canvas);
        document.body.appendChild(this.note.canvas);
    }

    makeCtrls() {
        const ctrls = document.createElement('aside');
        this.ctrls.playCtrl = document.createElement('span');
        this.ctrls.playCtrl.classList.add('play-ctrl', 'paused');
        ctrls.appendChild(this.ctrls.playCtrl);
        document.body.appendChild(ctrls);

        ctrls.addEventListener('click', (e) => {
            if (e.target.classList.contains('playing')) {
                this.stopLoop();
            }
            else if (e.target.classList.contains('paused')) {
                this.playLoop();
            }
        });
    }

    toggleNote(beatIndex, pitchIndex) {
        const octave = parseInt(pitchIndex / this.config.scales[this.config.scale].length);
        const note = pitchIndex % this.config.scales[this.config.scale].length;
        const noteName = this.config.scales[this.config.scale][note] + (this.config.rootOctave + octave);

        if (this.score[beatIndex][noteName]) {
            delete this.score[beatIndex][noteName];
        } else {
            this.score[beatIndex][noteName] = true;
        }

        this.note.ctx.beginPath();
        this.note.ctx.strokeStyle = "white";
        this.note.ctx.fillStyle = '#f2740c';
        this.note.ctx.fillRect(
            beatIndex * this.config.noteSizeX,
            pitchIndex * this.config.noteSizeY,
            this.config.noteSizeX,
            this.config.noteSizeY
        );

        console.log('TOGGLE NOTE', beatIndex, noteName, this.score[beatIndex][noteName]);
    }

    playLoop() {
        this.stopLoop();
        this.loopIntervalId = setInterval(() => {
            this.nextTick();
        }, this.config.durationMs);

        this.ctrls.playCtrl.classList.remove('paused');
        this.ctrls.playCtrl.classList.add('playing');
    }

    stopLoop() {
        if (this.loopIntervalId) {
            clearInterval(this.loopIntervalId);
        }

        this.ctrls.playCtrl.classList.remove('playing');
        this.ctrls.playCtrl.classList.add('paused');
    }

    nextTick() {
        Object.keys(this.score[this.tickIndex]).forEach(noteName => {
            this.sounds[noteName].play();
        });

        if (this.lastTickIndex !== undefined) {
            this.tick.ctx.clearRect(
                this.config.noteSizeX * this.lastTickIndex, 0,
                this.config.noteSizeX,
                this.tick.canvas.height
            );
        }

        this.tick.ctx.globalAlpha = 0.25;
        this.tick.ctx.fillStyle = 'white';
        this.tick.ctx.fillRect(
            this.config.noteSizeX * this.tickIndex, 0,
            this.config.noteSizeX,
            this.tick.canvas.height
        );
        this.tick.ctx.globalAlpha = 1;

        this.lastTickIndex = this.tickIndex;

        this.tickIndex++;
        if (this.tickIndex >= this.score.length) {
            this.tickIndex = 0;
        }
    }
}
