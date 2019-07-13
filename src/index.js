document.addEventListener('DOMContentLoaded', run);

import css from './index.css';

const config = {
    octaves: 2,
    scale: 'major',
    scales: {
        major: [
            0, 2, 4, 5, 7, 9, 10, 12
        ]
    },
    notesPerBar: 4,
    totalBars: 12
}

function run(){
    makeGrid();
}

function makeGrid() {
    const $grid = document.createElement('main');
    for (let bar=0; bar < config.totalBars; bar ++) {
        const $bar = document.createElement('section');
        for (let divInBar=0; divInBar < config.notesPerBar; divInBar ++) {
            const $div = document.createElement('div');
            for (let octave=0; octave < config.octaves; octave ++) {
                const $octave = document.createElement('div');
                $octave.className = 'octave';
                for (let note=0; note < config.scales[config.scale].length; note ++) {
                    const $note = document.createElement('span');
                    $octave.appendChild($note);
                    $note.innerText = `${bar} ${divInBar} ${note}`;
                }
                $div.appendChild($octave);
            }
            $bar.appendChild($div);
        }
        $grid.appendChild($bar);
    }
    document.body.appendChild($grid);
}