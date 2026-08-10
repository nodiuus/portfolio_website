import { For, Show } from "solid-js";
import { availabilityOptions, candidateProfile } from "../data/availability";
import type { XmbAction, XmbItem } from "../types";

type DetailContentProps = {
  item: XmbItem;
  activeAction: number;
  availabilityIndex: number;
  onAvailabilitySelect: (index: number) => void;
  onBookMeeting: () => void;
  onActionSelect: (index: number) => void;
  onFollow: (action: XmbAction) => void;
};

const facts = [
  { label: "Location", value: candidateProfile.location },
  { label: "Status", value: candidateProfile.status },
  { label: "Role focus", value: candidateProfile.preferredRole },
];

export function DetailContent(props: DetailContentProps) {
  return (
    <>
      <Show when={props.item.id === "profile-summary" || props.item.id === "about"}>
        <section class="xmb-profile-timeline" aria-label="About Nisan">
          <p>{props.item.body}</p>
          <ol>
            <For each={facts}>
              {(fact) => (
                <li>
                  <span aria-hidden="true" />
                  <small>{fact.label}</small>
                  <strong>{fact.value}</strong>
                </li>
              )}
            </For>
          </ol>
        </section>
      </Show>

      <Show when={props.item.education} keyed>
        {(education) => (
          <section class="xmb-history-panel" aria-label="Education history">
            <header><span>Education</span><strong>{education.period}</strong></header>
            <ol>
              <li>
                <span aria-hidden="true" />
                <div>
                  <small>{education.detail}</small>
                  <strong>{education.institution}</strong>
                  <p>{education.degree}</p>
                </div>
              </li>
            </ol>
          </section>
        )}
      </Show>

      <Show when={props.item.id === "coursework"}>
        <section class="xmb-topic-stack" aria-label={props.item.label}>
          <article>
            <span>Relevant study</span>
            <strong>Computer Science foundations</strong>
            <p>{props.item.body}</p>
          </article>
        </section>
      </Show>

      <Show when={props.item.id === "availability"}>
        <section class="xmb-availability" aria-label="Nisan availability">
          <header>
            <div><span>Location</span><strong>{candidateProfile.location}</strong></div>
            <div><span>Status</span><strong>{candidateProfile.status}</strong></div>
          </header>
          <p>{candidateProfile.availabilitySummary}. Select the window that best fits your schedule.</p>
          <div class="xmb-availability-grid" role="listbox" aria-label="Preferred meeting windows">
            <For each={availabilityOptions}>
              {(option, index) => (
                <button
                  type="button"
                  classList={{ "is-active": props.availabilityIndex === index() }}
                  aria-selected={props.availabilityIndex === index()}
                  onClick={() => props.onAvailabilitySelect(index())}
                >
                  <span class="xmb-availability-check" aria-hidden="true" />
                  <strong>{option.label}</strong>
                  <small>{option.detail}</small>
                </button>
              )}
            </For>
          </div>
          <button type="button" class="xmb-book-button" onClick={props.onBookMeeting}>
            <span>Book a meeting</span><b>›</b>
          </button>
        </section>
      </Show>

      <Show when={props.item.resume} keyed>
        {(resume) => (
          <section class="xmb-resume-entry" aria-label={`${props.item.label} resume entry`}>
            <header>
              <strong>{resume.organization}</strong>
              <Show when={resume.location}><span class="xmb-resume-location">{resume.location}</span></Show>
            </header>
            <time class="xmb-resume-period">{resume.period}</time>
            <p>{props.item.body}</p>
            <ul><For each={resume.highlights}>{(highlight) => <li>{highlight}</li>}</For></ul>
          </section>
        )}
      </Show>

      <Show when={
        !["profile-summary", "about", "availability", "education-history", "coursework"].includes(props.item.id ?? "") &&
        !props.item.resume
      }>
        <p>{props.item.body}</p>
      </Show>

      <Show when={props.item.meta?.length}>
        <ul class="xmb-meta-list"><For each={props.item.meta}>{(meta) => <li>{meta}</li>}</For></ul>
      </Show>

      <Show when={props.item.actions?.length}>
        <div class="xmb-action-list" role="listbox" aria-label="Item actions">
          <For each={props.item.actions}>
            {(action, index) => (
              <button
                type="button"
                classList={{ "is-active": props.activeAction === index() }}
                aria-selected={props.activeAction === index()}
                onMouseEnter={() => props.onActionSelect(index())}
                onClick={() => props.onFollow(action)}
              >
                <span>{action.label}</span><b>›</b>
              </button>
            )}
          </For>
        </div>
      </Show>
    </>
  );
}
