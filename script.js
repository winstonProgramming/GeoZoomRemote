// creating html element constants
const zoom_level_label = document.getElementById('zoom_level');
const hideable_maps = document.getElementsByClassName('hideable_map');
const max_possible_points_label = document.getElementById('max_possible_points');
const answer_map = document.getElementById('answer_map');
const guess_marker = document.getElementById('guess_marker');
const submit_guess_button = document.getElementById('submit_guess_button');
const answer_marker = document.getElementById('answer_marker');
const answer_pop_up = document.getElementById('answer_pop_up');
const average_score = document.getElementById('average_score');
const question_map_10 = document.getElementById('question_map_10');
const round_display = document.getElementById('round');
const next_round_button = document.getElementById('next_round_button');
const game_end_pop_up_text = document.getElementById('game_end_pop_up_text');
const game_end_pop_up_overlay = document.getElementById('game_end_pop_up_overlay');

// declaring up inter-round variables
let long_answers = [-46.18399091395088, -83.98465828243476, -1.8448359302091717, 109.2835461389675, 58.14107256482882];
let lat_answers = [-23.99402015472745, 15.24077712103626, 16.087281206973188, 39.492920603297364, 57.81592563680921];
let points_record = [];
let average_score_variable;

// measuring dimensions of site
const rect = answer_map.getBoundingClientRect();
const style = getComputedStyle(answer_map);

const border_left = parseFloat(style.borderLeftWidth) || 0;
const border_right = parseFloat(style.borderRightWidth) || 0;
const border_top = parseFloat(style.borderTopWidth) || 0;
const border_bottom = parseFloat(style.borderBottomWidth) || 0;

const content_width = rect.width - border_left - border_right;
const content_height = rect.height - border_top - border_bottom;

let round = 1;

// declaring up intra-round variables
let long_answer = long_answers[round - 1];
let lat_answer = lat_answers[round - 1];
let zoom = 10;
let max_possible_points = 1000;
let long_guess = null;
let lat_guess = null;

function zoom_in()
{
    if (zoom < 10)
    {
        zoom++;
        update_question_map(true);
        if (!round_over())
            display_zoom();
    }
}

function zoom_out()
{
    if (zoom > 1)
    {
        zoom--;
        update_question_map(false);
        if (!round_over())
        {
            display_zoom();
            update_max_possible_points();
            display_max_possible_points();
        }
    }
}

function update_question_map(zooming_in)
{
    if (zoom < 10)
        hideable_maps[zoom - 1].style.display = 'inline';

    if (zooming_in)
        hideable_maps[zoom - 2].style.display = 'none';
    else
        if (zoom < 9)
            hideable_maps[zoom].style.display = 'none';
}

function display_zoom()
{
    zoom_level_label.textContent = 'Zoom Level: ' + zoom;
}

function update_max_possible_points()
{
    if (zoom * 100 < max_possible_points)
        max_possible_points = zoom * 100;
}

function display_max_possible_points()
{
    max_possible_points_label.textContent = 'Max possible points: ' + max_possible_points.toLocaleString();
}

answer_map.addEventListener('click', function(event)
{
    // preventing user from interacting with answer map if the round is over
    if (round_over())
        return;

    const click_x = event.clientX - rect.left;
    const click_y = event.clientY - rect.top;

    const x = click_x - border_left;
    const y = click_y - border_top;

    // preventing user from clicking on answer map border
    if (x < 0 || y < 0 || x > content_width || y > content_height)
      return;

    const scaled_x = (x / content_width);
    const scaled_y = (y / content_height);

    long_guess = scaled_x * 360 - 180;
    // scaling latitude based on mercator projection latitude spread
    lat_guess = Math.atan(Math.sinh(scaled_y * 2 * Math.PI - Math.PI)) * (-180 / Math.PI);

    // displaying guess marker
    guess_marker.style.display = 'inline-block';
    guess_marker.style.left = event.clientX.toString() - guess_marker.width/2 + 'px';
    guess_marker.style.top = event.clientY.toString() - guess_marker.height + 'px';
});

submit_guess_button.addEventListener('click', function()
{
    // preventing user from submitting guess if the round is over or if they don't have a guess
    if (round_over() || long_guess === null || lat_guess === null)
        return;

    // displaying answer marker
    answer_marker.style.display = 'inline-block';
    const long_answer_x = ((long_answer + 180) / 360) * content_width + border_left + rect.left;
    const long_answer_y = (((Math.asinh(Math.tan(lat_answer / (-180 / Math.PI)))) + Math.PI) / 2 / Math.PI) * content_height + border_top + rect.top;
    answer_marker.style.left = long_answer_x - answer_marker.width / 2 + 'px';
    answer_marker.style.top = long_answer_y - answer_marker.height + 'px';

    // calculating points
    const distance_off = ((Math.abs(long_answer - long_guess)) ** 2 + (Math.abs(lat_answer - lat_guess)) ** 2) ** 0.5;
    const distance_forgiveness = 3;
    const point_scaling_factor = -0.1;
    let distance_off_rounded = distance_off - distance_forgiveness;
    if (distance_off_rounded < 0)
        distance_off_rounded = 0;
    const points = Math.round(logistic(distance_off_rounded, 2, point_scaling_factor, 0) * max_possible_points);
    points_record.push(points);

    function logistic(x, L, k, x_zero)
    {
        return L / (1 + Math.exp(-k * (x - x_zero)));
    }

    // updating and displaying answer pop up
    const miles_off = Math.round(distance_off * 69.17);
    const kilometers_off = Math.round(distance_off * 111.13);
    answer_pop_up.textContent = 'You were ' + miles_off.toLocaleString() +
        ' miles or ' + kilometers_off.toLocaleString() +
        ' kilometers off: ' + points.toLocaleString() +
        ' points';
    answer_pop_up.style.display = 'inline-block';

    //updating average score
    let score_sum = 0
    for (const i of points_record)
        score_sum += i;
    average_score_variable = Math.round(score_sum/round)
    average_score.textContent = 'Average score: ' + average_score_variable;

    // zooming map out
    zoom = 1;
    hideable_maps[0].style.display = 'inline';
    for (let i = 1; i < 9; i++)
        hideable_maps[i].style.display = 'none';
});

next_round_button.addEventListener('click', function()
{
    // preventing user from going to the next round if the round is not over
    if (!round_over())
        return;

    // checking that there are more rounds
    if (round !== 5)
    {
        // incrementing round
        round++;

        // updating round display
        round_display.textContent = 'Round ' + round + '/5';

        // resetting intra-round variables
        long_answer = long_answers[round - 1];
        lat_answer = lat_answers[round - 1];
        zoom = 10;
        max_possible_points = 1000;
        long_guess = null;
        lat_guess = null;

        // hiding elements
        guess_marker.style.display = 'none';
        answer_marker.style.display = 'none';
        answer_pop_up.style.display = 'none';

        display_zoom();
        display_max_possible_points();

        // updating pngs
        for (let i = 0; i < 9; i++)
            hideable_maps[i].src = 'question_maps_png/question_map_' + (i + 1) + '_' + round + '.png';
        question_map_10.src = 'question_maps_png/question_map_10_' + round + '.png';

        // hiding pngs
        for (let i = 0; i < 9; i++)
            hideable_maps[i].style.display = 'none';
    }
    else
    {
        // updating and displaying game end pop up
        game_end_pop_up_text.innerHTML = 'Your score today was ' + average_score_variable + '. Play again tomorrow! Follow me on <a href="https://github.com/winstonProgramming" target="_blank">GitHub</a>.';
        game_end_pop_up_overlay.style.display = 'flex';
    }
});

// checking if round is over
function round_over()
{
    return points_record.length === round;
}
