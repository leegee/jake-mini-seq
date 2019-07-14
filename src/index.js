import css from './index.css';

import { Howl, Howler } from 'howler';

document.addEventListener('DOMContentLoaded', () => {
    new JakesMiniSeq().run();
});

class JakesMiniSeq {
    static dataUriPrefix = 'data:text/plain;base64,';
    scale = 'major';
    tempoMs = 200;
    instrument = 'acoustic_grand_piano';
    notesPerBar = 4;
    totalBars = 8;
    config = {
        soundsDir: './assets/soundfont/',
        instrumentSuffix: '-mp3',
        delay: 0,
        velocity: 127,
        rootOctave: 3,
        totalOctaves: 3,
        scales: {
            major: [
                'C', 'D', 'E', 'F', 'G', 'A', 'B'
            ]
        }
    };
    note = {
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
        this.score.music = new Array(this.totalBars * this.notesPerBar);
    }

    run() {
        this.loadSounds();
        this.makeCavnas();
        this.makeCtrls();
        this.urlToScore();
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

    removeCanvas() {
        this.scrollWrapper.parentNode.removeChild(this.scrollWrapper);
    }

    makeCavnas() {
        this.scrollWrapper = document.createElement('section');
        this.scrollWrapper.setAttribute('id', 'scroll-wrapper');

        this.score.canvas = document.createElement('canvas');
        this.score.canvas.setAttribute('id', 'score');
        this.score.ctx = this.score.canvas.getContext('2d');

        this.note.canvas = document.createElement('canvas');
        this.note.canvas.setAttribute('id', 'notes');
        this.note.ctx = this.note.canvas.getContext('2d');

        this.tick.canvas = document.createElement('canvas');
        this.tick.canvas.setAttribute('id', 'tick');
        this.tick.ctx = this.tick.canvas.getContext('2d');

        this.tick.canvas.width = this.note.canvas.width = this.score.canvas.width =
            this.note.size.x * this.totalBars * this.notesPerBar;
        
        this.tick.canvas.height = this.note.canvas.height = this.score.canvas.height 
            = this.note.size.y * this.config.totalOctaves * this.config.scales[this.scale].length;

        this.scrollWrapper.style.height = this.tick.canvas.height + 'px';

        this.scrollWrapper.addEventListener('click', (e) => {
            const x = e.pageX - e.target.offsetLeft + this.scrollWrapper.scrollLeft;
            const y = this.score.canvas.height - e.pageY - e.target.offsetTop;
            const beatIndex = parseInt(x / this.note.size.x);
            const pitchIndex = parseInt(y / this.note.size.y);
            this.toggleNote(beatIndex, pitchIndex);
        });

        this.score.ctx.globalAlpha = 0.5;

        let x = 0;
        let beatIndex = 0;

        for (let bar = 0; bar < this.totalBars; bar++) {
            for (let beatInBar = 0; beatInBar < this.notesPerBar; beatInBar++) {
                this.score.music[beatIndex] = this.score.music[beatIndex] || {};
                this.score.ctx.beginPath();
                this.score.ctx.strokeStyle = "white";
                if (beatIndex % this.notesPerBar === 0 && beatIndex !== 0) {
                    this.score.ctx.lineWidth = 2;
                } else {
                    this.score.ctx.lineWidth = 1;
                }
                this.score.ctx.moveTo(x, 0);
                this.score.ctx.lineTo(x, this.score.canvas.height);
                this.score.ctx.stroke();
                x += this.note.size.x;
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
                y += this.note.size.y;
                note++;
            }
        }

        this.score.ctx.globalAlpha = 1;

        this.scrollWrapper.appendChild(this.score.canvas);
        this.scrollWrapper.appendChild(this.tick.canvas);
        this.scrollWrapper.appendChild(this.note.canvas);
        document.body.appendChild(this.scrollWrapper);
    }

    makeCtrls() {
        const ctrls = document.createElement('aside');
        ctrls.id = 'ctrls';
        ctrls.innerHTML = `
        <span id='rewind-ctrl' class='rewind'>◀</span>
        <span id='play-ctrl' class='paused'>❚❚</span>
        <span id='save-ctrl'>💾</span>
        
        <fieldset>
            <legend>Tempo</legend>
            <input type='range' id='tempo-ms' min=10 max=1000 step=25 value=${this.tempoMs}>
        </fieldset>

        <select id='instrument-ctrl'>
            <option value='acoustic_grand_piano'>Piano</option>
            <option value='X'>X</option>
        </select>

        <fieldset>
            <legend>Beats per bar</legend>
            <select id='beats-in-bar-ctrl'>
                <option value='3'>3</option>
                <option value='4'>4</option>
                <option value='5'>5</option>
                <option value='7'>7</option>
            </select>
        </fieldset>

        <fieldset>
            <legend>Total bars</legend>
            <select id='total-bars-ctrl'>
                <option value='4'>4</option>
                <option value='8'>8</option>
                <option value='12'>12</option>
                <option value='24'>24</option>
            </select>
        </fieldset>
        `;
        document.body.appendChild(ctrls);
        this.ctrls.playCtrl = document.getElementById('play-ctrl');
        
        document.getElementById('instrument-ctrl').addEventListener('change', (e) => {
            this.instrument = e.target.options[e.target.selectedIndex].value;
            this.loadSounds();
        });
        
        const bib = document.getElementById('beats-in-bar-ctrl');
        bib.value = this.notesPerBar;
        bib.addEventListener('change', (e) => {
            this.beatInBar = e.target.options[e.target.selectedIndex].value;
            this.removeCanvas();
            this.makeCavnas();
            this.renderScore();
        });

        const tbc = document.getElementById('total-bars-ctrl');
        tbc.value = this.totalBars;
        tbc.addEventListener('change', (e) => {
            this.totalBars = e.target.options[e.target.selectedIndex].value;
            this.removeCanvas();
            this.makeCavnas();
            this.renderScore();
        });
        tbc.value = this.totalBars;

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
            delete this.score.music[beatIndex][noteName];
            method = 'clearRect';
        } else {
            this.score.music[beatIndex][noteName] = true;
            method = 'fillRect';
            this.sounds[noteName].play();
        }

        console.log('TOGGLE NOTE', beatIndex, noteName, pitchIndex, this.score.music[beatIndex][noteName]);
        this.drawNote(method, beatIndex, pitchIndex);
    }

    drawNote(method, beatIndex, pitchIndex) {
        if (method === 'fillRect') {
            this.note.ctx.beginPath();
            this.note.ctx.strokeStyle = "white";
            this.note.ctx.fillStyle = this.note.clrs[
                pitchIndex % this.config.scales[this.scale].length
            ];
        }
        this.note.ctx[method](
            beatIndex * this.note.size.x,
            this.score.canvas.height - ((pitchIndex + 1) * this.note.size.y),
            this.note.size.x,
            this.note.size.y
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
            this.note.size.x * this.tick.previous, 0,
            this.note.size.x,
            this.tick.canvas.height
        );
        this.tick.ctx.clearRect(
            this.note.size.x * this.tick.now, 0,
            this.note.size.x,
            this.tick.canvas.height
        );
        this.tick.previous = undefined;
        this.tick.now = 0;
        this.scrollWrapper.scrollLeft = 0;
    }

    nextTick() {
        const lengthToPlay = this.totalBars * this.notesPerBar; // this.score.music.length;
        if (this.tick.now > 4 && this.tick.now  < lengthToPlay - 4) {
            this.scrollWrapper.scrollBy({
                left: this.note.size.x,
                top: 0,
                behavior: 'smooth'
            });
        }

        Object.keys(this.score.music[this.tick.now]).forEach(noteName => {
            this.sounds[noteName].play();
        });

        if (this.tick.previous !== undefined) {
            this.tick.ctx.clearRect(
                this.note.size.x * this.tick.previous, 0,
                this.note.size.x,
                this.tick.canvas.height
            );
        }

        this.tick.ctx.globalAlpha = 0.25;
        this.tick.ctx.fillStyle = 'white';
        this.tick.ctx.fillRect(
            this.note.size.x * this.tick.now, 0,
            this.note.size.x,
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
            const jsonStr = atob(
                document.location.search.substr(1)
            ).substr(JakesMiniSeq.dataUriPrefix.length);

            const fromUri = JSON.parse(jsonStr);
            this.score.music = fromUri.music;
            this.scale = fromUri.scale;
            this.tempoMs = fromUri.tempoMs;

            this.renderScore();
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
