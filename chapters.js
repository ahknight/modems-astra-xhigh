// Chapter dates refer to the home-computing era or to adoption of a recommendation.
// The references link to the underlying editions, which sometimes postdate adoption.
(() => {
  const rec = (name, edition) => 'https://www.itu.int/rec/T-REC-' + name + (edition ? '-' + edition : '') + '/en';
  const cite = (url, label) => '<a href="' + url + '">' + label + '</a>';
  const bingham = 'https://archive.computerhistory.org/resources/access/text/2017/09/102738563-05-01-acc.pdf';
  const maxwell = 'https://archive.computerhistory.org/resources/access/text/2017/09/102740207-05-01-acc.pdf';
  const forney = 'https://doi.org/10.1109/35.556483';
  const forneyNotes = 'https://ocw.mit.edu/courses/6-451-principles-of-digital-communication-ii-spring-2005/28eebe8f610d548070dae1bf3f74b6cd_chap_1.pdf';

  window.ModemChapters = [
    {
      id: '300', year: '1970s', standard: 'Bell 103', title: 'Two tones, one bit',
      dek: 'One steady whistle meant the far end was there. A change of pitch could carry the first letter you typed.',
      body: `<h3>Leave the receiver off the hook</h3>
        <p>Imagine calling a computer with a home-built Pennywhistle. Before you type anything, there is already a sound on the line. In the pauses between characters the transmitter holds the tone for one, called a <em>mark</em>. Lee Felsenstein’s receiver took advantage of those steady intervals to keep track of the pitch. The same resting tone that helped his circuit stay tuned also gave a person listening at the handset something to recognize. ${cite('https://www.worldradiohistory.com/Archive-Poptronics/70s/1976/Poptronics-1976-03.pdf', 'Felsenstein’s construction article, pp. 43–50')}</p>
        <h3>Follow a single keystroke</h3>
        <p>The caller switches between nominal pitches of 1070 Hz for zero and 1270 Hz for one. The answering modem uses 2025 and 2225 Hz respectively. A receiver can filter out its own band and hear its partner while both are talking. The high, steady answering mark announces an available carrier. Changes of pitch then carry the bits, a method called frequency-shift keying. ${cite('https://www.rfc-editor.org/rfc/rfc4734.html#section-2.7.1', 'IETF signaling descriptions')}</p>
        <p>A <em>symbol</em> is one opportunity to choose a signal. Baud counts those opportunities per second, even when successive choices are identical. Here one symbol carries one bit. With one start bit, eight data bits and one stop bit, a nominal 300-bit/s link delivers 30 characters per second. CCITT’s V.21 used a different tone plan at the same top rate. Both ends had to agree on the plan. ${cite(rec('V.21'), 'CCITT V.21')} · ${cite('https://www.rfc-editor.org/rfc/rfc4734.html', 'RFC 4734')}</p>`,
    },
    {
      id: '1200', year: '1980', standard: 'V.22', title: 'Four ways to turn a wave',
      dek: 'Keep the pitch in its own strip of the line. Turn the wave a quarter, half or three-quarter cycle, or leave it where it was.',
      body: `<h3>Four choices at every tick</h3>
        <p>Picture the carrier as a hand turning around a clock face. At each symbol boundary, the V.22 transmitter can change its position relative to the previous symbol in four ways. Those choices encode four pairs of bits. At nominally 600 symbols per second, two bits per symbol yield 1200 bit/s. You hear a rough carrier because the sequence keeps altering the wave. Doubling the pitch would do nothing to double the information. ${cite(rec('V.22'), 'CCITT V.22, §§2.1, 2.5')}</p>
        <h3>Two computers, two bands</h3>
        <p>As in the Bell 103, each direction has its own frequency band. In the normal V.22 call the caller uses a carrier centered on 1200 Hz and the answerer uses 2400 Hz. During startup the receiver looks for recognizable signal patterns and synchronizes before handing data to the computer. The recommendation also provides an optional 600-bit/s synchronous mode with fewer choices at each tick. ${cite(rec('V.22'), 'CCITT V.22, §§1–2, 6')}</p>
        <p>The road to this international standard ran through several competing products. At Vadic, John Bingham and Kim Maxwell worked on the VA3400. AT&amp;T offered the Bell 212 family. Their differing designs created a market for answering equipment that could speak several modes. The date here is CCITT’s Geneva adoption of V.22 in 1980. Commercial 1200-bit/s dial-up came earlier. ${cite(bingham, 'Bingham interview')} · ${cite(maxwell, 'Maxwell interview')} · ${cite(rec('V.22'), 'V.22 publication history')}</p>`,
    },
    {
      id: '2400', year: '1984', standard: 'V.22bis', title: 'Sixteen places to land',
      dek: 'The clock keeps its old pace. A receiver that can judge a wave’s size as well as its position can read four bits in a single choice.',
      body: `<h3>Give the wave a second dimension</h3>
        <p>V.22bis keeps the two carrier bands and the nominal 600-baud rhythm of V.22. Quadrature amplitude modulation, or QAM, lets each symbol choose among sixteen positions. Think of placing a pin on a small map. Its distance from the center sets the wave’s amplitude and its direction sets the phase. Sixteen possible destinations carry four bits per tick, twice the information of V.22. ${cite(rec('V.22bis'), 'CCITT V.22bis, §2 and Figure 1')}</p>
        <h3>Teach the receiver the line</h3>
        <p>A telephone circuit blurs one symbol into the next. With sixteen choices a small displacement can put the pin nearer the wrong destination. An adaptive equalizer learns how much of the preceding symbols bleeds into the present one and compensates. Vadic engineer John Bingham recalled that building a sufficiently fast receiver called for custom signal-processing chips in early 2400-bit/s designs. ${cite(bingham + '#page=12', 'Bingham on the receiver, p. 12')}</p>
        <p>The CCITT handshake opens using the older signaling. A brief repeating pair of bit-pairs, 00 then 11, identifies a V.22bis partner. If both support the exchange they train at the higher rate. A V.22 partner using a compatible 1200-bit/s mode can complete the call at 1200. The answering modem’s guard tone also depends on the national option. ${cite(rec('V.22bis'), 'V.22bis, §§2.1, 6.3')}</p>
        <blockquote><p>“a product blessed with a standard before the market”</p><cite>Kim Maxwell, describing the 2400-bit/s generation to James Pelkey in 1988. ${cite(maxwell + '#page=30', 'Interview, p. 30')}</cite></blockquote>`,
    },
    {
      id: '9600', year: '1984', standard: 'V.32', title: 'Hear through your own echo',
      dek: 'Both ends now speak over the same frequencies at the same time. To hear the other modem, each has to learn the sound of itself.',
      body: `<h3>Reclaim the other half of the line</h3>
        <p>V.22bis gave each direction its own band. V.32 gives both directions the same nominal 1800 Hz carrier and brings the symbol rate up to 2400 baud. Some of what a modem sends comes straight back through the telephone circuit. Its echo canceller uses the known outgoing signal to predict that returning copy, then subtracts the prediction from what it hears. The distant transmitter can now occupy the same band. ${cite(rec('V.32'), 'CCITT V.32, §§1–2, 5')} · ${cite(forneyNotes, 'G. David Forney Jr., MIT lecture')}</p>
        <h3>What those training bursts buy</h3>
        <p>Predicting an echo means finding its delay and strength. Startup signals establish round-trip delay, condition the receiver and give each modem time to train. The partners exchange rate sequences before admitting user data. CCITT adopted V.32 at the same 1984 assembly as V.22bis. These were parallel designs with very different receiver requirements. ${cite(rec('V.32', '198811-S'), 'V.32, original date and §§5–6')} · ${cite(rec('V.22bis'), 'V.22bis, original date')}</p>
        <p>At 9600 bit/s, each symbol carries four information bits. V.32 specified a 16-point mode for interoperability and a 32-point trellis-coded alternative. The extra choices let a receiver favor a whole plausible sequence when one symbol is ambiguous. Gottfried Ungerboeck developed trellis-coded modulation at IBM. The V.32 code is associated with Lee-Fang Wei. ${cite(rec('V.32'), 'V.32, §2.4')} · ${cite('https://ethw.org/Oral-History%3AGottfried_Ungerboeck', 'Ungerboeck interview')} · ${cite(forneyNotes, 'Forney on Wei’s code')}</p>`,
    },
    {
      id: '14400', year: '1991', standard: 'V.32bis', title: 'A denser alphabet',
      dek: 'The two modems still trade 2400 symbols a second. Now each symbol has to yield six information bits on a good call.',
      body: `<h3>Read the sequence</h3>
        <p>At 14,400 bit/s, V.32bis packs six information bits into each symbol on the same nominal 1800 Hz carrier as V.32. An encoder adds a bit derived from earlier decisions and picks from 128 signal points. That extra bit gives the receiver clues about which paths through the points are possible. A point smudged by noise may make sense once its neighbors arrive. This extends the trellis technique of Ungerboeck and Wei to a denser alphabet. ${cite(rec('V.32bis'), 'CCITT V.32bis, §§1–2 and Figure 2')} · ${cite(forneyNotes, 'Forney on modem codes')}</p>
        <h3>Let the line have a vote</h3>
        <p>CCITT’s February 1991 recommendation requires five line rates from 4800 to 14,400 bit/s in 2400-bit/s steps. The two ends exchange rate information during startup. They can also agree to change speed during a call without repeating a full retrain. That lets a connection survive a stretch of noise even when the highest rate becomes unusable. ${cite(rec('V.32bis'), 'V.32bis, §§1, 6–8')}</p>
        <p>Two other labels on the box answered different questions. Optional V.42 error control groups data into frames, detects damage and arranges retransmission. Optional V.42bis compression replaces repeated strings with dictionary codes over an error-controlled link. Text could arrive at a rate above the line’s nominal bit rate when reconstructed. A compressed archive offered much less to squeeze. ${cite(rec('V.42'), 'CCITT V.42')} · ${cite(rec('V.42bis'), 'CCITT V.42bis')}</p>`,
    },
    {
      id: '28800', year: '1994', standard: 'V.34', title: 'Take the measure of a line',
      dek: 'Before either computer sends a file, the modems run a little experiment. Which frequencies made the journey intact?',
      body: `<h3>The buzz is a measuring instrument</h3>
        <p>V.32bis worked to a fixed symbol clock. V.34 can choose among clocks, carrier frequencies and ways to emphasize parts of the signal. After the V.8 capability exchange, each end sends a known combination of pitches. The other end compares what arrived with what it expected. A missing or weakened pitch tells it where trouble lies. This probing helps the partners choose settings for this particular call. ${cite(rec('V.8'), 'ITU-T V.8')} · ${cite(rec('V.34'), 'V.34, §§5, 10–11')}</p>
        <h3>Spend the signal power carefully</h3>
        <p>A transmitter has a power budget. V.34’s shell mapping favors groups of lower-energy points, while trellis coding helps separate valid sequences. After probing, known patterns train the equalizers and echo cancellers. Final training establishes the data parameters in each direction. One link can end up faster than the other. ${cite(forney, 'Forney, Brown, Eyuboglu and Moran on V.34')} · ${cite(rec('V.34'), 'V.34, §§9–11')}</p>
        <p>During development, engineers called the project V.fast. Motorola’s G. David Forney Jr., Les Brown, M. Vedat Eyuboglu and John L. Moran III documented how competing proposals contributed to the ITU-T result. The September 1994 edition topped out at 28,800 bit/s. Among the standard’s symbol rates, 2400, 3000 and 3200 baud are mandatory. Extra rates let suitably equipped pairs fit more kinds of line. ${cite(forney, 'The engineers’ account')} · ${cite(rec('V.34'), 'ITU-T editions and §5.2')}</p>`,
    },
    {
      id: '33600', year: '1996', standard: 'V.34 revised', title: 'The last stretch of voiceband',
      dek: 'Two calls can open with the same familiar probing sound and settle at different speeds. The difference emerges after the measurements.',
      body: `<h3>A larger map of possible signals</h3>
        <p>ITU-T Study Group 14 revised V.34 in 1996. Its new maximum alphabet contained 1664 signal points, up from 960 in the earlier design. Each operating mode draws a subset from this larger map. More choices per group of symbols allow a higher bit rate, provided the receiver can separate neighboring possibilities after their trip down the line. Forney and colleagues describe this enlargement as the change that enabled 33.6 kbit/s. ${cite(forney, 'Forney and colleagues, constellation mapping')} · ${cite(rec('V.34', '199610-S'), 'ITU-T V.34, October 1996')}</p>
        <h3>A speed to negotiate</h3>
        <p>The recommendation makes 31,200 and 33,600 bit/s optional. Both partners have to support the rate and the measured line has to sustain it. They can choose separate rates in each direction. A rough call can settle back at 28,800 or below while using the same family of probes. This explains why the early sounds alone could never tell you the eventual connect speed. ${cite(rec('V.34', '199610-S'), 'V.34, §§1, 5, 11')}</p>
        <p>People often call this generation “V.34bis” or “V.34+.” The ITU catalog lists it as the October 1996 edition of <em>V.34</em>. The distinction matters when reading manuals. Two boxes marked V.34 could have different maximum rates. ${cite(rec('V.34'), 'ITU-T edition history')}</p>`,
    },
    {
      id: '56000', year: '1998', standard: 'V.90', title: 'Change one end of the call',
      dek: 'The decisive upgrade was at the provider. Its digital connection let it choose the very sample values that the exchange would turn into sound.',
      body: `<h3>Make the telephone exchange the transmitter</h3>
        <p>V.34 assumed an analog modem on each end. With V.90, a provider feeds pulse-code modulation (PCM) values directly into the digital telephone network. At the far exchange a converter plays one level after another onto the subscriber’s analog pair. The home modem learns to identify those levels. At the maximum, seven information bits on average per sample times a nominal 8000 samples per second gives 56,000 bit/s downstream. Noise, digital impairments and transmit-power limits can reduce the usable set of levels. U.S. Robotics told American buyers to expect a ceiling around 53.3 kbit/s under FCC power limits, even before ordinary line problems. ${cite(rec('V.90'), 'ITU-T V.90, §§1, 5 and Appendix I')} · ${cite(rec('G.711'), 'G.711 telephone PCM')} · ${cite('https://support.usr.com/support/5610b/5610b-ug/five.html', 'U.S. Robotics on the U.S. limit')}</p>
        <h3>A lopsided conversation</h3>
        <p>The home modem still sends an analog signal into the network. V.90 uses V.34 modulation upstream, up to 33,600 bit/s with the optional higher rates. Startup uses V.8 to identify compatible partners, probes the line, trains and exchanges final parameters. A connection unsuitable for PCM can fall back to full-duplex V.34. Two ordinary analog home modems calling each other lack the digital server endpoint that makes 56K possible. ${cite(rec('V.90'), 'V.90, §§1, 9–10')}</p>
        <h3>The number on the box</h3>
        <p>Brent Townshend developed a PCM approach while working on music distribution over phone lines. Commercial 56K arrived through rival systems, U.S. Robotics’ x2 and K56flex from the Rockwell-led group including Lucent. Buyers needed a provider with compatible equipment. The ITU-T’s September 1998 approval of V.90 supplied a common standard. V.92 followed in 2000 with faster repeat startups, modem-on-hold and a PCM upstream mode reaching up to 48,000 bit/s. ${cite('https://archive.computerhistory.org/resources/access/text/2022/11/102792696-05-01-acc.pdf', 'Townshend interview')} · ${cite('https://people.bu.edu/tsimcoe/documents/published/FFSv4.pdf#page=15', 'Research on the rival systems')} · ${cite(rec('V.90'), 'V.90 approval')} · ${cite(rec('V.92'), 'ITU-T V.92')}</p>
        <p>Once the modems agree, the familiar <code>CONNECT</code> appears locally on the terminal. The connection can now carry a BBS prompt, or a second conversation in which PPP establishes a link and configures a network protocol. The audible modem handshake got the two ends to this point. ${cite(rec('V.250'), 'ITU-T command and result codes')} · ${cite('https://www.rfc-editor.org/rfc/rfc1661', 'IETF Point-to-Point Protocol')}</p>`,
    },
  ];
})();
