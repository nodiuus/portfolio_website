import { For, Show } from "solid-js";
import type { MusicTrack } from "../types";

type MusicExperienceProps = {
  tracks: MusicTrack[];
  activeTrack: number;
  playerOpen: boolean;
  onTrackSelect: (index: number) => void;
  onTrackActivate: (index: number) => void;
  onClosePlayer: () => void;
};

export function MusicExperience(props: MusicExperienceProps) {
  const selected = () => props.tracks[props.activeTrack] ?? props.tracks[0];

  return (
    <section class="xmb-media-view" aria-label="Music library" data-player-open={props.playerOpen}>
      <img class="xmb-media-child-arrow" src="/psp/icons/arrow.svg" alt="" aria-hidden="true" />

      <ul class="xmb-music-list" role="listbox" aria-label="Tracks">
        <For each={props.tracks}>
          {(track, index) => {
            const level = () => index() - props.activeTrack;
            return (
              <li
                class="xmb-music-item"
                classList={{ "is-active": level() === 0, "is-above": level() < 0 }}
                aria-selected={level() === 0}
                style={{ "--xmb-music-offset": `calc(${level()} * 72px)` }}
                onClick={() => level() === 0 ? props.onTrackActivate(index()) : props.onTrackSelect(index())}
              >
                <img src={track.artwork} alt="" referrerpolicy="no-referrer" />
                <div><strong>{track.title}</strong><span>{track.artist}</span></div>
              </li>
            );
          }}
        </For>
      </ul>

      <aside
        class="xmb-music-player"
        data-open={props.playerOpen}
        aria-hidden={!props.playerOpen}
        data-source-ready={Boolean(selected().playbackUrl)}
        data-track-accent={selected().accent}
        style={{ "--track-accent": selected().accent }}
      >
        <header class="xmb-music-player-topbar">
          <span class="xmb-music-player-kind"><img src="/psp/icons/music.svg" alt="" /></span>
          <span class="xmb-music-player-trackline">
            <strong>{selected().title}</strong>
            <small>{selected().artist}</small>
          </span>
          <b>{props.activeTrack + 1} / {props.tracks.length}</b>
          <button type="button" aria-label="Close music player" onClick={props.onClosePlayer}><span aria-hidden="true">×</span></button>
        </header>

        <main class="xmb-music-player-stage">
          <div class="xmb-music-player-meta">
            <img src={selected().artwork} alt={`${selected().title} cover`} referrerpolicy="no-referrer" />
            <div>
              <span>Now playing</span>
              <h2>{selected().title}</h2>
              <footer><p>{selected().artist}</p><b>MP3</b></footer>
            </div>
          </div>

          <div class="xmb-music-visualizer" aria-hidden="true">
            <For each={Array.from({ length: 18 })}>
              {(_, column) => (
                <span style={{ "--bar-index": String(column()) }}>
                  <For each={Array.from({ length: 8 })}>{(_, row) => <i data-row={7 - row()} />}</For>
                </span>
              )}
            </For>
          </div>
        </main>

        <div class="xmb-coverflow" aria-hidden="true">
          <For each={props.tracks}>
            {(track, index) => (
              <span classList={{ "is-active": index() === props.activeTrack }} style={{ "--cover-offset": String(index() - props.activeTrack) }}>
                <img src={track.artwork} alt="" referrerpolicy="no-referrer" />
                <i><img src={track.artwork} alt="" referrerpolicy="no-referrer" /></i>
              </span>
            )}
          </For>
        </div>

        <div class="xmb-music-transport">
          <Show
            when={selected().playbackUrl}
            fallback={
              <>
                <button type="button" class="xmb-music-play" aria-label="Playback source unavailable" disabled><span /></button>
                <small>Playback source unavailable</small>
              </>
            }
          >
            {(playbackUrl) => (
              <>
                <button
                  type="button"
                  class="xmb-music-play"
                  aria-label={`Open ${selected().title} on YouTube`}
                  data-playback-url={playbackUrl()}
                  onClick={() => window.open(playbackUrl(), "nisan-music", "popup,width=1120,height=760,noopener,noreferrer")}
                >
                  <span />
                </button>
                <small>Open on YouTube</small>
              </>
            )}
          </Show>
        </div>

        <footer class="xmb-music-player-footer">
          <div><i /><small>00:00 / {selected().duration ?? "--:--"}</small></div>
        </footer>
      </aside>
    </section>
  );
}
