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
    scoreCanvas;
    noteCanvas;
    scoreCtx;
    noteCtx;
    ctrls = { playCtrl: null };
    sounds = {};
    loopIntervalId;
    tickIndex = 0;
    lastTickIndex;

    constructor() {
        this.score = new Array(this.config.totalBars * this.config.notesPerBar);

        this.scoreCanvas = document.createElement('canvas');
        this.scoreCanvas.setAttribute('id', 'score');
        this.scoreCtx = this.scoreCanvas.getContext('2d');
        this.noteCanvas = document.createElement('canvas');
        this.noteCanvas.setAttribute('id', 'notes');
        this.noteCtx = this.scoreCanvas.getContext('2d');
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
        this.noteCanvas.width = this.scoreCanvas.width = this.config.noteSizeX * this.config.totalBars * this.config.notesPerBar;
        this.noteCanvas.height = this.scoreCanvas.height = this.config.noteSizeY * this.config.totalOctaves * this.config.scales[this.config.scale].length;
        
        this.noteCanvas.addEventListener('click', (e) => {
            const x = e.pageX - e.target.offsetLeft;
            const y = e.pageY - e.target.offsetTop;
            const beatIndex = parseInt(x / this.config.noteSizeX);
            const pitchIndex = parseInt(y / this.config.noteSizeY);
            this.toggleNote(beatIndex, pitchIndex);
        });

        this.scoreCtx.globalAlpha = 0.5;

        let x = 0;
        let beatIndex = 0;

        for (let bar = 0; bar < this.config.totalBars; bar++) {
            for (let beatInBar = 0; beatInBar < this.config.notesPerBar; beatInBar++) {
                this.score[beatIndex] = {};
                this.scoreCtx.beginPath();
                this.scoreCtx.strokeStyle = "white";
                if (beatIndex % this.config.notesPerBar === 0 && beatIndex !== 0) {
                    this.scoreCtx.lineWidth = 2;
                } else {
                    this.scoreCtx.lineWidth = 1;
                }
                this.scoreCtx.moveTo(x, 0);
                this.scoreCtx.lineTo(x, this.scoreCanvas.height);
                this.scoreCtx.stroke();
                x += this.config.noteSizeX;
                beatIndex++;
            }
        }

        let y = 0;
        let note = 0;
        let scaleLength = this.config.scales[this.config.scale].length;

        for (let octave = this.config.rootOctave; octave < this.config.rootOctave + this.config.totalOctaves; octave++) {
            for (let noteInScale = 0; noteInScale < scaleLength; noteInScale++) {
                this.scoreCtx.beginPath();
                this.scoreCtx.strokeStyle = "white";
                if (note % scaleLength === 0 && note !== 0) {
                    this.scoreCtx.lineWidth = 2;
                } else {
                    this.scoreCtx.lineWidth = 1;
                }
                this.scoreCtx.moveTo(0, y);
                this.scoreCtx.lineTo(this.scoreCanvas.width, y);
                this.scoreCtx.stroke();
                y += this.config.noteSizeY;
                note++;
            }
        }

        this.scoreCtx.globalAlpha = 1;

        document.body.appendChild(this.scoreCanvas);
        document.body.appendChild(this.noteCanvas);
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

        this.noteCtx.beginPath();
        this.noteCtx.strokeStyle = "white";
        this.noteCtx.fillStyle = '#f2740c';
        this.noteCtx.fillRect(
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
            this.tick();
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

    tick() {
        Object.keys(this.score[this.tickIndex]).forEach(noteName => {
            this.sounds[noteName].play();
        });

        this.lastTickIndex = this.tickIndex;
        this.tickIndex++;
        if (this.tickIndex >= this.score.length) {
            this.tickIndex = 0;
        }
    }
}
