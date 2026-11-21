// Original signal synthesis. Protocol references and listening assumptions are in SIGNALS.md.
(() => {
  'use strict';
  const rate = 24000;
  const tau = 2 * Math.PI;
  const pdf = (title, id) => ({
    title, url: 'https://www.itu.int/rec/dologin_pub.asp?lang=e&id=T-REC-' + id + '%21%21PDF-E&type=items'
  });
  const refs = {
    bell: pdf('ITU-T V.18 (1994), Annex D', 'V.18-199409-S'),
    v22: pdf('CCITT V.22 (1988), §§2, 5–6', 'V.22-198811-I'),
    bis22: pdf('CCITT V.22 bis (1988), §§2.4–2.5, 5–6', 'V.22bis-198811-I'),
    v32: pdf('ITU-T V.32 (1993), §§4–5 and Tables 1, 5, 6', 'V.32-199303-I'),
    bis32: pdf('CCITT V.32 bis (1991), §§4–6 and Tables 2, 4, 5', 'V.32bis-199102-I'),
    v34: pdf('ITU-T V.34 (1994), §10.1.2.4, Table 17 and §11.2', 'V.34-199409-S'),
    v34r: pdf('ITU-T V.34 (1998), §§7, 10.1.3 and 11.3', 'V.34-199802-I'),
    v8: pdf('ITU-T V.8 (1994), Tables 1–4 and §§7–8', 'V.8-199409-S'),
    v8pcm: pdf('ITU-T V.8 (1998), Tables 1–5, 7 and §§7–8', 'V.8-199802-S'),
    v90: pdf('ITU-T V.90 (1998), Tables 1, 10 and §§8.4, 9.3', 'V.90-199809-I')
  };

  const sampleCount = seconds => Math.round(seconds * rate);
  function render(seconds, value) {
    const out = new Float32Array(sampleCount(seconds));
    for (let i = 0; i < out.length; i++) out[i] = value(i / rate, i);
    return out;
  }
  function join(...buffers) {
    const out = new Float32Array(buffers.reduce((sum, item) => sum + item.length, 0));
    let i = 0;
    for (const item of buffers) { out.set(item, i); i += item.length; }
    return out;
  }
  function mixInto(out, signal, start) {
    const offset = sampleCount(start);
    for (let i = 0; i < signal.length; i++) out[i + offset] += signal[i];
  }
  const silence = t => new Float32Array(sampleCount(t));
  const stage = (at, title, text) => ({at, title, text});
  function answerTone(seconds, reverse = false, modulate = false) {
    return render(seconds, t => {
      const polarity = reverse && Math.floor(t / .45) % 2 ? -1 : 1;
      const level = modulate ? 1 + .2 * Math.sin(tau * 15 * t) : 1;
      return .25 * polarity * level * Math.sin(tau * 2100 * t);
    });
  }
  function frame(byte) {
    const bits = [0];
    for (let bit = 0; bit < 8; bit++) bits.push((byte >> bit) & 1);
    return [...bits, 1];
  }
  function textBits(message) {
    return Array.from(message).flatMap(ch => frame(ch.charCodeAt(0)));
  }
  function fsk(bits, space, mark) {
    let cycles = 0;
    return render(bits.length / 300, (_, n) => {
      const v = .21 * Math.sin(tau * cycles);
      cycles += (bits[Math.floor(n / (rate / 300))] ? mark : space) / rate;
      cycles -= Math.floor(cycles);
      return v;
    });
  }
  function bell() {
    const length = 7;
    const marks = n => Array(n).fill(1);
    const answer = [...marks(1200), ...textBits('READY\r\n'.repeat(10))];
    const call = [...marks(600), ...textBits('HELLO\r\n'.repeat(10))];
    const samples = silence(length);
    mixInto(samples, fsk([...answer, ...marks(length * 300 - answer.length)], 2025, 2225), 0);
    mixInto(samples, fsk([...call, ...marks((length - 2) * 300 - call.length)], 1070, 1270), 2);
    return {samples, stages:[
      stage(0, 'Answer mark', 'The far end holds one high note at 2,225 Hz. A steady mark is an idle one.'),
      stage(2, 'Caller joins', 'Listen for the lower note entering at 1,270 Hz. Each end now has its own pair of pitches on the same wire.'),
      stage(4, 'Connected · text crosses', 'The caller sends HELLO and the answerer sends READY. Each voice drops by 200 Hz for a zero, then rises for a one.')
    ], method:'Bell 103-compatible FSK synthesis. Actual 300-bit/s characters in both directions. The pauses, words and mix are editorial choices.', sources:[refs.bell]};
  }
  // Each output bit is XORed with earlier output bits at the specified tap delays.
  function scrambler(tap, length, limitOnes = false) {
    let history = 0, ones = 0;
    return function next(bit = 1) {
      if (limitOnes && ones === 64) { bit ^= 1; ones = 0; }
      const out = bit ^ ((history >>> (tap - 1)) & 1) ^ ((history >>> (length - 1)) & 1);
      history = ((history << 1) | out) & ((1 << length) - 1);
      ones = out ? ones + 1 : 0;
      return out;
    };
  }
  function rotate(x, y, q) {
    return [[x, y], [-y, x], [-x, -y], [y, -x]][q & 3];
  }
  // Finite approximation to a root-raised-cosine pulse, in units of one symbol.
  function rrc(t, beta) {
    if (Math.abs(t) < 1e-7) return 1 + beta * (4 / Math.PI - 1);
    if (Math.abs(Math.abs(4 * beta * t) - 1) < 1e-7) {
      const angle = Math.PI / (4 * beta);
      return beta / Math.SQRT2 * ((1 + 2 / Math.PI) * Math.sin(angle) + (1 - 2 / Math.PI) * Math.cos(angle));
    }
    return (Math.sin(Math.PI * t * (1 - beta)) + 4 * beta * t * Math.cos(Math.PI * t * (1 + beta))) /
      (Math.PI * t * (1 - (4 * beta * t) ** 2));
  }
  function modulate(points, baud, carrier, beta, level) {
    const table = new Map();
    return render(points.length / baud, (t, n) => {
      const tick = Math.floor(n * baud / rate);
      const rem = (n * baud) % rate;
      let weights = table.get(rem);
      if (!weights) {
        weights = Array.from({length: 13}, (_, k) => {
          const dt = rem / rate - (k - 6);
          return Math.abs(dt) < 6 ? rrc(dt, beta) * (.5 + .5 * Math.cos(Math.PI * dt / 6)) : 0;
        });
        table.set(rem, weights);
      }
      let x = 0, y = 0;
      for (let k = 0; k < weights.length; k++) {
        const point = points[tick + k - 6];
        if (!point) continue;
        x += point[0] * weights[k];
        y += point[1] * weights[k];
      }
      return level * (x * Math.cos(tau * carrier * t) - y * Math.sin(tau * carrier * t));
    });
  }
  const phaseSteps = [1, 0, 2, 3];
  function v22(bis) {
    const start = 3.375; // 3.3 seconds of answer tone and 75 ms of quiet.
    const callStart = 367; // (155 + 456) ms, rounded to the nearest 600-baud symbol.
    const answerReply = callStart + (bis ? 60 : 162);
    const total = 2600;
    const samples = silence(start + total / 600);
    mixInto(samples, answerTone(3.3), 0);
    for (const caller of [false, true]) {
      let quadrant = 0, pos = 0;
      const scramble = scrambler(14, 17, true);
      const data = textBits(caller ? 'HELLO\r\n' : 'READY\r\n');
      const begin = caller ? callStart : 0;
      const signature = caller ? callStart : answerReply;
      const switchRate = answerReply + (caller ? 60 : 0) + 360;
      const dataStart = bis ? switchRate + 120 : answerReply + (caller ? 162 : 0) + 459;
      const points = [];
      for (let i = begin; i < total; i++) {
        const read = () => scramble(i < dataStart ? 1 : data[pos++ % data.length]);
        let dibit;
        if (!caller && i < answerReply) dibit = 3;
        else if (bis && i < signature + 60) dibit = (i - signature) % 2 ? 3 : 0;
        else dibit = 2 * read() + read();
        quadrant = (quadrant + phaseSteps[dibit]) % 4;
        const suffix = bis && i >= switchRate ? 2 * read() + read() : 1;
        points.push(rotate(1 + 2 * (suffix & 1), 1 + 2 * (suffix >> 1), quadrant));
      }
      mixInto(samples, modulate(points, 600, caller ? 1200 : 2400, .75, .065), start + begin / 600);
    }
    const payload = start + (bis ? answerReply + 60 + 360 + 120 : answerReply + 162 + 459) / 600;
    return {samples, stages:[
      stage(0, 'Answer tone', 'The answering modem sends a steady 2,100 Hz tone. A brief silence separates this from the first modulated carrier.'),
      stage(start, 'A high-channel mark', 'The answerer sends repeated ones. Every pair rotates the signal by a quarter turn at 600 changes per second.'),
      stage(start + callStart / 600, bis ? 'S1 · request 2,400' : 'Train both receivers', bis ? 'A short alternating pattern asks for the faster mode. The far end repeats it. Both send scrambled ones before moving to sixteen signal states.' : 'The caller starts sending scrambled ones. The answerer follows. The predictable input makes an irregular sound that helps each receiver synchronize.'),
      stage(payload, 'Connected · two-way text', bis ? 'Each symbol now carries four bits. This model sends repeated HELLO and READY characters. Training and text can sound surprisingly alike.' : 'The same carriers now transport repeated HELLO and READY characters, two bits per symbol. The speaker lets you hear the data after connection.')
    ], method:'Nominal ' + (bis ? 'V.22 bis' : 'V.22') + ' exchange and data, synthesized at symbol level. Starts at answer tone. Ideal detection timing, short pulse filters, no guard tone or line distortion.', sources:bis ? [refs.bis22] : [refs.v22, refs.bis22]};
  }
  function v32(bis) {
    const carrier = 1800, baud = 2400;
    const states = [[-3, -1], [1, -3], [3, 1], [-1, 3]];
    // Excerpt 1 isolates the caller's AA and the answerer's AC ranging signals.
    const acquisition = silence(1.26);
    const steady = Array(2400).fill(states[0]);
    const alternating = Array.from({length: 2400}, (_, i) => states[2 * (i % 2)]);
    mixInto(acquisition, modulate(steady, baud, carrier, .25, .06), 0);
    mixInto(acquisition, modulate(alternating, baud, carrier, .25, .06), .26);
    // Excerpt 2 is uninterrupted: answering modem's S, S-bar, TRN and R1.
    const points = [];
    for (let i = 0; i < 272; i++) points.push(states[(i >= 256 ? 2 : 0) + i % 2]);
    const scramble = scrambler(5, 23);
    let state = 0;
    for (let i = 0; i < 4800; i++) {
      const first = scramble(), second = scramble();
      state = i < 256 ? first * 2 : [0, 1, 3, 2][first * 2 + second];
      points.push(states[state]);
    }
    const rateMask = bis ? '0000111111111001' : '0000011110010001';
    for (let repeat = 0; repeat < 180; repeat++) {
      for (let j = 0; j < 16; j += 2) {
        const dibit = 2 * scramble(Number(rateMask[j])) + scramble(Number(rateMask[j + 1]));
        state = (state + phaseSteps[dibit]) % 4;
        points.push(states[state]);
      }
    }
    const rangeStart = 2.35, trainStart = rangeStart + 1.26 + .15;
    return {samples:join(answerTone(2.2, true), silence(.15), acquisition, silence(.15), modulate(points, baud, carrier, .25, .08)), stages:[
      stage(0, 'Answer with reversals', 'The 2,100 Hz tone periodically flips its phase. Telephone-network echo-control equipment can recognize that signal.'),
      stage(rangeStart, 'Ranging excerpts', 'First the caller holds state A. Then the answerer alternates opposite states A and C, producing a low and a high tone. Their later reversals let the pair time the round trip.'),
      stage(trainStart, 'Train on a known sequence', 'A short repeating pattern gives the receiver a timing mark. Then known scrambled ones spread energy across the band so the receiver can learn how the line smears a symbol.'),
      stage(trainStart + 5072 / baud, bis ? 'Offer 14,400 bit/s' : 'Offer 9,600 bit/s', bis ? 'The repeated R1 message enables 14,400 and the lower V.32 bis rates. This short message uses the four-state alphabet both ends already know.' : 'The answerer advertises 4,800 and 9,600 bit/s and trellis capability. The caller would train in turn and reply with its own rate message.')
    ], method:'Edited ' + (bis ? 'V.32 bis' : 'V.32') + ' excerpts. The ranging tones are isolated and retimed. S, reversed S, TRN and the first rate offer use the specified symbol counts or permitted durations. Later duplex exchanges and payload are omitted.', sources:[bis ? refs.bis32 : refs.v32]};
  }
  function menu(pcm, answering) {
    const bytes = pcm ? [0xc1, 0x65, answering ? 0x8d : 0x0d, answering ? 0x47 : 0x27] : [0xc1, 0x45];
    return [...Array(10).fill(1), ...Array.from('0000001111', Number), ...bytes.flatMap(frame)];
  }
  function v8(pcm) {
    const cm = menu(pcm, false), jm = menu(pcm, true);
    const startCM = 1.5, interval = cm.length / 300;
    const startJM = startCM + 2 * interval, startCJ = startJM + 2 * interval;
    const out = silence(startCJ + .1 + .075);
    mixInto(out, answerTone(startJM, true, true), 0);
    const repeat = (bits, n) => Array.from({length:n}, () => bits).flat();
    mixInto(out, fsk([...repeat(cm, 4), ...[0, 0, 0].flatMap(frame)], 1180, 980), startCM);
    mixInto(out, fsk([...repeat(jm, 2), ...jm.slice(0, 30)], 1850, 1650), startJM);
    return {out, stages:[
      stage(0, 'Modified answer tone', 'Listen for a flutter around a steady whistle. A 15 Hz change in loudness on the 2,100 Hz tone invites a V.8 negotiation.'),
      stage(startCM, 'Exchange menus', pcm ? 'At just 300 bit/s, the caller offers V.34 plus analogue V.90. The answering menu reports a digital V.90 endpoint. Three zero octets close the exchange.' : 'The caller sends a low-band menu, and the answerer replies on the upper band. Both advertise V.34. A brief three-octet acknowledgement ends the conversation.')
    ]};
  }
  // Signs in the exact order of the harmonics of 150 Hz. A zero omits the tone.
  const probeWeights = [1,-1,1,1,1,0,1,0,1,1,-1,0,1,1,-1,0,1,-1,1,-1,-1,-1,-1,1,1];
  function lineProbe() {
    const period = render(1/150, t => probeWeights.reduce((sum, sign, i) =>
      sum + sign * Math.cos(tau * 150 * (i + 1) * t), 0) * .045);
    return render(.64, (t, i) => period[i % period.length] * (t < .16 ? 1 : 10 ** (-6 / 20)));
  }
  function v34Training() {
    const points = [];
    // Optional manufacturer-defined (MD) interval omitted.
    const a = Math.SQRT1_2;
    for (let i = 0; i < 144; i++) points.push(rotate(a, a, i % 2 + (i >= 128 ? 2 : 0)));
    for (let i = 0; i < 288; i++) {
      const k = Math.floor(i / 4);
      const theta = Math.PI * (k * (i % 4) + (k % 3 === 1 ? 4 : 0)) / 6;
      points.push([Math.cos(theta), Math.sin(theta)]);
    }
    const scramble = scrambler(5, 23);
    for (let i = 0; i < 4800; i++) {
      const first = scramble(), second = scramble();
      points.push(rotate(a, a, -(2 * second + first)));
    }
    return modulate(points, 3200, 1920, .1, .26);
  }
  function v34(revised) {
    const negotiation = v8(false);
    const probeStart = negotiation.out.length / rate + .12;
    const segments = [negotiation.out, silence(.12), lineProbe()];
    const stages = [...negotiation.stages, stage(probeStart, 'Probe the line', 'Twenty-one notes arrive together in a short buzz. The second burst uses the same notes 6 dB lower. Differences at the receiver reveal which frequencies survive and whether level matters.')];
    if (revised) {
      const trainingStart = probeStart + .64 + .15;
      segments.push(silence(.15), v34Training());
      stages.push(stage(trainingStart, 'Learn the line at speed', 'In this later excerpt a short repeating sequence called PP trains the equalizer. Scrambled ones follow. The receiver uses a known pattern to undo the blur between adjacent symbols.'));
    } else {
      segments.push(silence(.3), lineProbe());
      stages.push(stage(probeStart + .94, 'Probe back', 'The caller now sends the same two-level test in the reverse direction. Each receiver needs its own measurements before the pair can agree how to use the line.'));
    }
    return {samples:join(...segments), stages, method:revised ?
      'V.34 synthesis. The V.8 menus and L1/L2 tones use their documented bits and phases. A cut takes you to phase 3 at a chosen 3,200 baud. The output filter is illustrative. Rate selection and payload are omitted.' :
      'V.34 synthesis. Actual V.8 menu bits and L1/L2 probe frequencies, phases, level change and nominal L1 duration. Editorial gaps replace ranging, information frames and turnarounds. Playback ends before equalizer training.',
      sources:revised ? [refs.v8,refs.v34,refs.v34r] : [refs.v8,refs.v34]};
  }
  // G.711 mu-law linear magnitude for the positive V.90 universal code.
  function muLevel(ucode) {
    return (((ucode % 16) * 8 + 132) * 2 ** Math.floor(ucode / 16) - 132) / 32768;
  }
  function digitalTraining() {
    const values = [];
    const uInfo = 72, peak = muLevel(uInfo + 16);
    const word = [peak, 0, peak, -peak, 0, -peak];
    for (let i = 0; i < 432; i++) values.push(word[i % 6] * (i < 384 ? 1 : -1));
    const scramble = scrambler(18, 23);
    for (let i = 0; i < 14400; i++) values.push((scramble() ? 1 : -1) * muLevel(uInfo));
    return pcmToAudio(values);
  }
  function impairmentProbe() {
    const values = [], ref = muLevel(72);
    const sign = [1,1,-1,1,-1,-1,-1,-1,1,-1,1,1], train = [0,0,1,0,1,1];
    // One valid example descriptor. All requested levels fall in Uchord 5.
    for (let repeat = 0; repeat < 4; repeat++) {
      for (const u of [65,69,73,77]) {
        for (let i = 0; i < 768; i++) values.push(sign[i % sign.length] * (train[i % train.length] ? muLevel(u) : ref));
      }
    }
    return pcmToAudio(values);
  }
  function downstreamData() {
    // S=6 and K=36. With Mi=64 in every interval, each mixed-radix digit
    // consumes exactly six bits, least significant first (V.90 §5.4.3).
    const scramble = scrambler(18, 23), values = [];
    const message = Array.from('THE LINE IS OPEN.\r\n').flatMap(ch => frame(ch.charCodeAt(0)).slice(1, 9));
    let cursor = 0, polarity = 0;
    for (let n = 0; n < 2448; n++) {
      const read = () => scramble(n < 48 ? 1 : message[cursor++ % message.length]);
      const signs = Array.from({length: 6}, read);
      for (let i = 0; i < 6; i++) {
        let index = 0;
        for (let bit = 0; bit < 6; bit++) index += read() * 2 ** bit;
        polarity ^= signs[i];
        values.push((polarity ? 1 : -1) * muLevel(93 - index));
      }
    }
    return pcmToAudio(values);
  }
  function pcmToAudio(values) {
    // Use a windowed low-pass interpolation to hear an example analogue output.
    const kernel = [];
    for (let d = -36; d <= 36; d++) {
      const t = d / 3;
      const sinc = t === 0 ? .9 : Math.sin(.9 * Math.PI * t) / (Math.PI * t);
      kernel.push(sinc * (.5 + .5 * Math.cos(Math.PI * t / 12)));
    }
    return render(values.length / 8000, (_, i) => {
      let sum = 0;
      for (let k = Math.max(0, Math.ceil((i - 36) / 3)); k <= Math.min(values.length - 1, Math.floor((i + 36) / 3)); k++)
        sum += values[k] * kernel[i - 3 * k + 36];
      return 2 * sum;
    });
  }
  function v90() {
    const negotiation = v8(true);
    const train = digitalTraining();
    const start = negotiation.out.length / rate + .15;
    const dil = impairmentProbe();
    const dilStart = start + train.length / rate + .15;
    return {samples:join(negotiation.out, silence(.15), train, silence(.15), dil, silence(.15), downstreamData()), stages:[
      ...negotiation.stages,
      stage(start, 'Train on digital levels', 'After a cut to phase 3, the short Sd pattern establishes timing. Then the exchange sends two known PCM levels, 8,000 choices a second, to train the home receiver.'),
      stage(dilStart, 'Test the available levels', 'This example digital impairment test alternates reference and trial levels. What comes out of the telephone exchange tells the home modem which levels it can safely tell apart.'),
      stage(dilStart + dil.length / rate + .15, 'Connected · downstream data', 'After a cut past final negotiation, a brief B1d marks the handoff. The sustained sound carries the text THE LINE IS OPEN at 56,000 bit/s on an idealized downstream path.')
    ], method:'V.90 synthesis with actual V.8 menus, PCM training, an example impairment probe and a downstream data encoder. The constellation is assumed, the exchange filter illustrative. Cuts skip ranging, upstream signals and final parameter exchanges.',
      sources:[refs.v8pcm,refs.v90,refs.v34r]};
  }
  const builders = {'300':bell, '1200':() => v22(false), '2400':() => v22(true), '9600':() => v32(false), '14400':() => v32(true), '28800':() => v34(false), '33600':() => v34(true), '56000':v90};
  window.ModemSignals = { build(id) {
    if (!Object.hasOwn(builders, id)) throw new RangeError('Unknown modem rate');
    const result = builders[id]();
    // Short fades soften the edit at the loudspeaker without altering sustained levels.
    const fade = sampleCount(.004);
    for (let i = 0; i < fade; i++) {
      result.samples[i] *= i / fade;
      result.samples[result.samples.length - 1 - i] *= i / fade;
    }
    return {...result, rate};
  }};
})();
