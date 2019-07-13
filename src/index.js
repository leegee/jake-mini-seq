const { Howl, Howler } = require('howler');

document.addEventListener('DOMContentLoaded', run);

import css from './index.css';

const Config = {
    soundsDir: './assets/soundfont/acoustic_grand_piano-mp3/',
    delay: 0,
    velocity: 127,
    durationMs: 200,
    rootOctave: 3,
    octaves: 4,
    scale: 'major',
    scales: {
        major: [
            'C', 'D', 'E', 'F', 'G', 'A', 'B'
        ]
    },
    notesPerBar: 4,
    totalBars: 8
}

const Ctrls = {
    playCtrl: null
};
const ColumnBeatEls = [];
const Sounds = {};
const Score = new Array(Config.totalBars * Config.notesPerBar);
let loopInterval;
let tickIndex = 0;
let lastTickIndex;

function run() {
    loadSounds();
    makeGrid();
    listen();
    stopLoop();
}

function loadSounds() {
    for (let octave = 0; octave < Config.octaves; octave++) {
        for (let note = 0; note < Config.scales[Config.scale].length; note++) {
            const noteName = Config.scales[Config.scale][note] + (Config.rootOctave + octave);
            console.debug('Loading oct %d note %d :', octave, note, noteName);
            Sounds[noteName] = new Howl({
                src: [
                    Config.soundsDir + '/' + noteName + '.mp3'
                ]
            });
        }
    }
}

function makeGrid() {
    let beatIndex = -1;
    const $grid = document.createElement('main');

    for (let bar = 0; bar < Config.totalBars; bar++) {
        const $bar = document.createElement('section');
        $bar.className = 'bar';

        for (let beat = 0; beat < Config.notesPerBar; beat++) {
            beatIndex++;
            const $div = document.createElement('div');
            $div.className = 'beat';
            ColumnBeatEls.push($div);
            Score[beatIndex] = {};

            for (let octave = Config.rootOctave + Config.octaves - 1; octave >= Config.rootOctave; octave--) {
                const $octave = document.createElement('div');
                $octave.className = 'octave';
                // for (let note = 0; note < Config.scales[Config.scale].length; note++) {
                for (let note = Config.scales[Config.scale].length - 1; note >= 0; note--) {
                    const $note = document.createElement('span');
                    $note.index = (bar * Config.notesPerBar) + note;
                    $note.beatIndex = beatIndex;
                    $note.bar = bar;
                    $note.beat = beat;
                    $note.octave = octave;
                    $note.note = note;
                    $note.className = 'note';
                    $note.play = false;
                    $octave.appendChild($note);
                }
                $div.appendChild($octave);
            }
            $bar.appendChild($div);
        }
        $grid.appendChild($bar);
    }
    document.body.appendChild($grid);

    const ctrls = document.createElement('aside');
    Ctrls.playCtrl = document.createElement('span');
    Ctrls.playCtrl.classList.add('play-ctrl', 'paused');
    ctrls.appendChild(Ctrls.playCtrl);
    document.body.appendChild(ctrls);
}

function listen() {
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('note')) {
            toggleNote(e.target);
        }
        else if (e.target.classList.contains('playing')) {
            stopLoop();
        }
        else if (e.target.classList.contains('paused')) {
            playLoop();
        }
    });
}

function el2note(el) {
    return Config.scales[Config.scale][el.note] + el.octave;
}

function toggleNote(el) {
    el.play = !el.play;
    if (el.play) {
        Score[el.beatIndex][el2note(el)] = true;
        el.classList.add('play');
    } else {
        delete Score[el.beatIndex][el2note(el)];
        el.classList.remove('play');
    }
}

function playLoop() {
    stopLoop();
    loopInterval = setInterval(() => {
        tick();
    }, Config.durationMs);
    
    Ctrls.playCtrl.classList.remove('paused');
    Ctrls.playCtrl.classList.add('playing');
}

function stopLoop() {
    if (loopInterval) {
        clearInterval(loopInterval);
    }

    Ctrls.playCtrl.classList.remove('playing');
    Ctrls.playCtrl.classList.add('paused');
}

function tick() {
    if (typeof lastTickIndex !== 'undefined') {
        ColumnBeatEls[lastTickIndex].classList.remove('currentBeat');
    }

    ColumnBeatEls[tickIndex].classList.add('currentBeat');
    ColumnBeatEls[tickIndex].scrollIntoView();

    Object.keys(Score[tickIndex]).forEach( noteName => {
        Sounds[noteName].play();
    });

    lastTickIndex = tickIndex;
    tickIndex++;
    if (tickIndex >= Score.length) {
        tickIndex = 0;
    }
}
