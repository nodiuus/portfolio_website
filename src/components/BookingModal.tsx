import { For, Show } from "solid-js";
import { availabilityOptions, candidateProfile } from "../data/availability";

type BookingModalProps = {
  open: boolean;
  selectedIndex: number;
  bookingUrl?: string;
  onSelect: (index: number) => void;
  onClose: () => void;
  onContinue: () => void;
};

export function BookingModal(props: BookingModalProps) {
  return (
    <div class="booking-modal" data-open={props.open} aria-hidden={!props.open} role="dialog" aria-modal="true" aria-label="Book a meeting with Nisan">
      <button type="button" class="booking-modal-backdrop" aria-label="Close booking" onClick={props.onClose} />
      <section class="booking-card">
        <header>
          <div>
            <span>Schedule with Nisan</span>
            <h2>Choose a meeting window</h2>
          </div>
          <button type="button" class="booking-close" aria-label="Close booking" onClick={props.onClose}>×</button>
        </header>

        <div class="booking-candidate">
          <span class="booking-avatar" aria-hidden="true">N</span>
          <div>
            <strong>Software engineering conversation</strong>
            <span>{candidateProfile.location}</span>
          </div>
          <b>30 min</b>
        </div>

        <div class="booking-options" role="listbox" aria-label="Availability windows">
          <For each={availabilityOptions}>
            {(option, index) => (
              <button
                type="button"
                classList={{ "is-active": props.selectedIndex === index() }}
                aria-selected={props.selectedIndex === index()}
                onClick={() => props.onSelect(index())}
              >
                <span class="booking-radio" aria-hidden="true" />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.detail}</small>
                </span>
              </button>
            )}
          </For>
        </div>

        <p class="booking-note">{availabilityOptions[props.selectedIndex]?.note}</p>

        <footer>
          <Show
            when={props.bookingUrl}
            fallback={
              <button type="button" disabled title="Add VITE_BOOKING_URL to connect Nisan's 20.com booking page">
                20.com link not connected
              </button>
            }
          >
            <button type="button" onClick={props.onContinue}>Continue to 20.com</button>
          </Show>
          <small>Times are confirmed through Nisan's connected booking page.</small>
        </footer>
      </section>
    </div>
  );
}
