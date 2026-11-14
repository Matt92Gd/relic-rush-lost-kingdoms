import { SeededRandom } from '../core/SeededRandom';
import { eventBus } from '../core/EventBus';
import type { ActiveDynamicEvent, BiomeId, DynamicEventType } from '../types/game.types';

interface EventDescriptor {
  type: DynamicEventType;
  title: string;
  description: string;
  duration: number;
  preferredBiomes?: BiomeId[];
}

const EVENT_CATALOG: EventDescriptor[] = [
  {
    type: 'collapsing_bridge',
    title: 'Ponte al Collasso!',
    description: 'Le corsie cedono sotto il peso! Rimani vigile e cambia traiettoria.',
    duration: 12,
  },
  {
    type: 'avalanche',
    title: 'Pioggia di Detriti!',
    description: 'Massi cadono dall’alto: evita le aree segnalate in rosso!',
    duration: 13,
  },
  {
    type: 'volcanic_eruption',
    title: 'Eruzione Improvvisa!',
    description: 'Fiamme e cenere dal sottosuolo aumentano i getti di fuoco.',
    duration: 14,
    preferredBiomes: ['volcano', 'shadow'],
  },
  {
    type: 'sudden_tempest',
    title: 'Tempesta Eterea!',
    description: 'Raffiche improvvise sferzano il regno: concentrati sugli ostacoli!',
    duration: 12,
  },
  {
    type: 'ruined_temple_escape',
    title: 'Crollo del Tempio!',
    description: 'Le antiche volte stanno cedendo alle tue spalle!',
    duration: 13,
    preferredBiomes: ['jungle', 'desert'],
  },
  {
    type: 'intense_pursuit',
    title: 'Furia di Malakor!',
    description: 'Il Guardiano accelera! Sopravvivi per guadagnare un bonus punteggio.',
    duration: 11,
  },
];

export class DynamicEventSystem {
  private current: ActiveDynamicEvent | null = null;
  private cooldownSeconds = 18;

  public reset(): void {
    this.current = null;
    this.cooldownSeconds = 18;
    eventBus.emit('event:updated', null);
  }

  public getCurrentEvent(): ActiveDynamicEvent | null {
    return this.current;
  }

  public update(
    dt: number,
    distance: number,
    biome: BiomeId,
    rng: SeededRandom,
    onEventSurvived: () => void
  ): void {
    if (this.current) {
      if (this.current.warningSeconds > 0) {
        this.current.warningSeconds = Math.max(0, this.current.warningSeconds - dt);
      } else {
        this.current.remainingSeconds -= dt;
      }

      if (this.current.remainingSeconds <= 0) {
        if (!this.current.bonusAwarded) {
          this.current.bonusAwarded = true;
          onEventSurvived();
          eventBus.emit('toast:message', {
            title: `Evento Superato: ${this.current.title}`,
            subtitle: '+500 Punti Bonus Sopravvivenza!',
            kind: 'reward',
          });
        }
        this.current = null;
        this.cooldownSeconds = rng.range(22, 34);
        eventBus.emit('event:updated', null);
      } else {
        eventBus.emit('event:updated', { ...this.current });
      }
      return;
    }

    if (distance < 260) return;

    this.cooldownSeconds -= dt;
    if (this.cooldownSeconds <= 0) {
      const candidates = EVENT_CATALOG.filter(
        (e) => !e.preferredBiomes || e.preferredBiomes.includes(biome)
      );
      const chosen = rng.pick(candidates.length > 0 ? candidates : EVENT_CATALOG);
      this.current = {
        type: chosen.type,
        title: chosen.title,
        description: chosen.description,
        remainingSeconds: chosen.duration,
        totalDurationSeconds: chosen.duration,
        warningSeconds: 2.2,
        bonusAwarded: false,
      };
      eventBus.emit('event:started', { ...this.current });
      eventBus.emit('event:updated', { ...this.current });
      eventBus.emit('audio:sfx', { sfx: 'event_warning' });
    }
  }
}
