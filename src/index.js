
import { Howl, Howler } from 'howler';
import MicroModal from 'micromodal';

import './index.css';
import './modal.css';

document.addEventListener('DOMContentLoaded', () => {
    new JakesMiniSeq().run();
});

class NoteLayer {
    instrument;
    soundListIndex;
    canvas = undefined;
    ctx = undefined;
    clrs = [
        '#4A72EE',
        '#B651CF',
        '#E1377E',
        '#FF7727',
        '#FFBB2B',
        '#87B752',
        '#38B7BD',
    ];
    music = [];

    constructor(instrument, soundListIndex, totalBarsSupported, beatsPerBarSupported) {
        this.instrument = instrument;
        this.soundListIndex = soundListIndex;
        this.music = new Array(totalBarsSupported * beatsPerBarSupported);
    }
}

class JakesMiniSeq {
    static dataUriPrefix = 'data:text/plain;base64,';
    static instrumentSuffix = '-mp3';
    static soundsDir = './assets/soundfont/';
    static noteFileExtensions = ['mp3']; // TODO Add ogg for non-Chrome
    static instruments = SOUND_LIST;

    scale = 'major';
    tempoMs = 200;
    activeInstrument = 0;
    beatsPerBar = 4;
    totalBars = 8;
    config = {
        instruments: [
            { name: 'acoustic_grand_piano', rootOctave: 3, glyph: '🎹' },
            { name: 'celesta', rootOctave: 3, glyph: '🎹' },
            { name: 'choir_aahs', rootOctave: 3, glyph: '👩‍🎤' },
            { name: 'electric_bass_pick', rootOctave: 1, glyph: '𝄢' }, 
            { name: 'slap_bass_1', rootOctave: 1, glyph: '!' },
            { name: 'synth_bass_1', rootOctave: 1, glyph: '𝄢' },
            { name: 'koto', rootOctave: 3, glyph: 'ぁ' },
            { name: 'lead_2_sawtooth', rootOctave: 3, glyph: '🎹' },
            { name: 'lead_7_fifths', rootOctave: 3, glyph: '🎹' },
            { name: 'ocarina', rootOctave: 3, glyph: '🎺' },
            { name: 'overdriven_guitar', rootOctave: 3, glyph: '🎸' },
            { name: 'pad_1_new_age', rootOctave: 3, glyph: '♒' },
            { name: 'pad_7_halo', rootOctave: 3, glyph: '🎻' },
            { name: 'pad_8_sweep', rootOctave: 3, glyph: '😮' },
            { name: 'percussive_organ', rootOctave: 3  },
            { name: 'pizzicato_strings', rootOctave: 3, glyph: '🎻' },
            { name: 'synth_drum', rootOctave: 1, glyph: '🥁' },
            { name: 'woodblock', rootOctave: 3, glyph: '👏' },
        ],
        noteSize: {
            x: 30,
            y: 20,
        },
        totalBarsSupported: 12,
        beatsPerBarSupported: 9,
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
    noteLayers = [];
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
    sounds = [];
    loopIntervalId;

    constructor() {
        this.config.instruments.forEach((instrument, soundListIndex) => {
            this.noteLayers.push(
                new NoteLayer(
                    instrument,
                    soundListIndex,
                    this.config.totalBarsSupported,
                    this.config.beatsPerBarSupported
                )
            );
        })
    }

    run() {
        MicroModal.init();
        this.loadSounds();
        this.renderGrid();
        this.makeCtrls();
        this.urlTogrid();
        this.setActiveInstrument(this.activeInstrument);
        this.stopLoop();
    }

    setActiveInstrument(activeInstrument) {
        this.noteLayers[this.activeInstrument].canvas.classList.remove('activeInstrument');
        this.activeInstrument = activeInstrument;
        this.noteLayers[this.activeInstrument].canvas.classList.add('activeInstrument');
    }

    loadSounds() {
        this.noteLayers.forEach((noteLayer) => {
            this.loadInstrument(noteLayer);
        });
    }

    loadInstrument(noteLayer) {
        return (!this.sounds[noteLayer.soundListIndex]) ?
            this.loadSoundsIntoNoteLayer(noteLayer) : Promise.resolve();
    }

    loadSoundsIntoNoteLayer(noteLayer) {
        let loading = [];

        this.sounds[noteLayer.soundListIndex] = {};

        console.log('Load', noteLayer.soundListIndex, noteLayer.instrument.name, this.config.instruments[noteLayer.soundListIndex]);

        for (let octave = 0; octave < this.config.totalOctaves; octave++) {
            for (let note = 0; note < this.config.scales.chromatic.length; note++) {

                const noteName = this.config.scales.chromatic[note] + (noteLayer.instrument.rootOctave + octave);

                JakesMiniSeq.noteFileExtensions.forEach(ext => {
                    const filePath = JakesMiniSeq.soundsDir + '/' + noteLayer.instrument.name + JakesMiniSeq.instrumentSuffix + '/' + noteName + '.' + ext;

                    console.debug('Loading instrument %s %s oct %d note %d :', noteLayer.soundListIndex, noteLayer.instrument.name, octave, note, noteName, "\n", filePath);

                    loading.push(new Promise((resolve, reject) => {
                        this.sounds[noteLayer.soundListIndex][noteName] = new Howl({
                            src: [filePath],
                            onload: () => resolve(),
                            onloaderror: (id, err) => {
                                console.error(id, err);
                                reject(err);
                            }
                        });
                    }));
                });
            }
        }

        Promise.all(loading).then(() => {
            // Event, for whom?
        }).catch(e => {
            console.error(e);
            throw e;
        });
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

        this.tick.canvas.width = this.grid.canvas.width =
            this.config.noteSize.x * this.totalBars * this.beatsPerBar;

        this.tick.canvas.height = this.grid.canvas.height
            = this.config.noteSize.y * this.config.totalOctaves * this.config.scales[this.scale].length;

        for (let i = 0; i < this.noteLayers.length; i++) {
            this.noteLayers[i].canvas = document.createElement('canvas');
            this.noteLayers[i].canvas.classList.add('notes');
            this.noteLayers[i].ctx = this.noteLayers[i].canvas.getContext('2d');
            this.noteLayers[i].canvas.width = this.grid.canvas.width;
            this.noteLayers[i].canvas.height = this.grid.canvas.height;
            this.noteLayers[i].canvas.addEventListener('click', this.clickGrid.bind(this));
        }

        this.scrollWrapper.style.height = this.tick.canvas.height + 'px';

        this.grid.ctx.globalAlpha = 0.5;

        let x = 0;
        let beatIndex = 0;

        for (let bar = 0; bar < this.totalBars; bar++) {
            for (let beatInBar = 0; beatInBar < this.beatsPerBar; beatInBar++) {
                for (let i = 0; i < this.noteLayers.length; i++) {
                    this.noteLayers[i].music[beatIndex] = this.noteLayers[i].music[beatIndex] || {};
                }

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

        for (let octave = 0; octave < this.config.totalOctaves; octave++) {
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
        for (let i = 0; i < this.noteLayers.length; i++) {
            this.scrollWrapper.appendChild(this.noteLayers[i].canvas);
        }

        document.body.appendChild(this.scrollWrapper);
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
        this.ctrls.stopNotes = document.getElementById('stop-notes');
        this.instrumentSwitches = document.getElementById('instrument-switch-ctrls')
        this.config.instruments.forEach((instrument, instrumentIndex) => {
            const ctrl = document.createElement('button');
            ctrl.dataset.instrumentIndex = instrumentIndex;
            ctrl.title = instrument.name.replace(/[-_]/g, ' ');
            ctrl.innerText = instrument.glyph || '♩'; 
            this.instrumentSwitches.appendChild(ctrl);
        });
        this.instrumentSwitches.addEventListener('click', (e) => {
            console.log('Change instrument to ', e.target.dataset.instrumentIndex);
            this.setActiveInstrument(e.target.dataset.instrumentIndex);
        });

        const beatsPerBarCtrl = document.getElementById('beats-per-bar-ctrl');
        beatsPerBarCtrl.value = this.beatsPerBar;
        beatsPerBarCtrl.addEventListener('change', (e) => {
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

        const totalBarsCtrl = document.getElementById('total-bars-ctrl');
        totalBarsCtrl.value = this.totalBars;
        totalBarsCtrl.addEventListener('change', (e) => {
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
        const rootOctave = this.noteLayers[this.activeInstrument].instrument.rootOctave;

        const octave = parseInt(pitchIndex / this.config.scales[this.scale].length);
        const note = pitchIndex % this.config.scales[this.scale].length;
        const noteName = this.config.scales[this.scale][note] + (rootOctave + octave);
        let method;

        if (this.noteLayers[this.activeInstrument].music[beatIndex][noteName] !== undefined) {
            delete this.noteLayers[this.activeInstrument].music[beatIndex][noteName];
            method = 'clearRect';
        } else {
            this.noteLayers[this.activeInstrument].music[beatIndex][noteName] = true;
            method = 'fillRect';
            this.sounds[this.activeInstrument][noteName].play();
        }

        console.log('INST %s %s  NOTE', this.activeInstrument, method, beatIndex, noteName, pitchIndex, this.noteLayers[this.activeInstrument].music[beatIndex][noteName]);
        this.drawNote(method, beatIndex, pitchIndex);
    }

    drawNote(method, beatIndex, pitchIndex) {
        if (method === 'fillRect') {
            this.noteLayers[this.activeInstrument].ctx.beginPath();
            this.noteLayers[this.activeInstrument].ctx.strokeStyle = "white";
            this.noteLayers[this.activeInstrument].ctx.fillStyle = this.noteLayers[this.activeInstrument].clrs[
                pitchIndex % this.config.scales[this.scale].length
            ];
        }
        this.noteLayers[this.activeInstrument].ctx[method](
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

        this.noteLayers.forEach( (noteLayer, noteLayerIndex) => {
            if (this.ctrls.stopNotes.checked && typeof this.tick.previous !== 'undefined') {
                Object.keys(this.noteLayers[noteLayerIndex].music[this.tick.previous]).forEach(noteName => {
                    this.sounds[noteLayerIndex][noteName].stop();
                });
            }
            Object.keys(this.noteLayers[noteLayerIndex].music[this.tick.now]).forEach(noteName => {
                this.sounds[noteLayerIndex][noteName].play();
            });
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
                    noteLayers: this.noteLayers,
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
                this.noteLayers = fromUri.noteLayers;
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
        for (let i = 0; i < this.noteLayers.length; i++) {
            this.noteLayers[i].music.forEach((tick, beatIndex) => {
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
}
