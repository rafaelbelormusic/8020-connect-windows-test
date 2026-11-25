#!/bin/bash
# Two sound cards as null sinks. *_mic is a virtual microphone whose input is
# chosen per test (loop from a speaker, or a played file).
set -e
mkdir -p ~/.config/pulse && RATE=${RATE:-48000}; printf "default-sample-rate = $RATE\nalternate-sample-rate = $RATE\ndefault-sample-channels = 2\n" > ~/.config/pulse/daemon.conf
pulseaudio --check 2>/dev/null || pulseaudio --start --exit-idle-time=-1
for n in host_out guest_out host_in guest_in; do pactl load-module module-null-sink sink_name=$n rate=$RATE channels=2 >/dev/null; done
pactl load-module module-remap-source source_name=host_mic master=host_in.monitor >/dev/null
pactl load-module module-remap-source source_name=guest_mic master=guest_in.monitor >/dev/null
pactl load-module module-remap-source source_name=host_loop master=host_out.monitor >/dev/null
pactl load-module module-remap-source source_name=guest_loop master=guest_out.monitor >/dev/null
pactl set-default-sink host_out; pactl set-default-source host_mic; pactl list short sinks
