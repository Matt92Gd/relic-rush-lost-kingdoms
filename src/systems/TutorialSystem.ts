import { eventBus } from '../core/EventBus';
import type { TutorialStep } from '../types/game.types';

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'tut_lane',
    title: 'Cambio Corsia',
    instructionDesktop: 'Premi [A / D] o [← / →] per spostarti tra le tre corsie',
    instructionMobile: 'Scorri a Sinistra o Destra per cambiare corsia',
    requiredAction: 'lane',
  },
  {
    id: 'tut_jump',
    title: 'Salto',
    instructionDesktop: 'Premi [W], [↑] o [SPAZIO] per saltare gli ostacoli bassi',
    instructionMobile: 'Scorri verso l’Alto per saltare gli ostacoli bassi',
    requiredAction: 'jump',
  },
  {
    id: 'tut_slide',
    title: 'Scivolata',
    instructionDesktop: 'Premi [S] o [↓] per scivolare sotto gli archi',
    instructionMobile: 'Scorri verso il Basso per scivolare sotto gli archi',
    requiredAction: 'slide',
  },
  {
    id: 'tut_turn',
    title: 'Curve a 90°',
    instructionDesktop: 'Quando appare una curva, usa [← / →] o [A / D] per svoltare!',
    instructionMobile: 'Alle curve, scorri nella direzione del nuovo corridoio!',
    requiredAction: 'turn',
  },
  {
    id: 'tut_powerup',
    title: 'Power-Up & Reliquie',
    instructionDesktop: 'Raccogli sfere luminose e monete: sei pronto per la fuga!',
    instructionMobile: 'Raccogli sfere luminose e monete: buona fuga!',
    requiredAction: 'powerup',
  },
];

export class TutorialSystem {
  private active = false;
  private stepIndex = 0;
  private autoAdvanceTimer = 0;

  public start(enabled: boolean): void {
    this.active = enabled;
    this.stepIndex = 0;
    this.autoAdvanceTimer = 5.5;
    eventBus.emit('tutorial:step', this.active ? TUTORIAL_STEPS[0] : null);
  }

  public isActive(): boolean {
    return this.active;
  }

  public getCurrentStep(): TutorialStep | null {
    return this.active ? TUTORIAL_STEPS[this.stepIndex] ?? null : null;
  }

  public notifyAction(action: TutorialStep['requiredAction'], onCompleted: () => void): void {
    if (!this.active) return;
    const current = TUTORIAL_STEPS[this.stepIndex];
    if (!current || current.requiredAction !== action) return;
    this.advance(onCompleted);
  }

  public update(dt: number, onCompleted: () => void): void {
    if (!this.active) return;
    this.autoAdvanceTimer -= dt;
    if (this.autoAdvanceTimer <= 0) {
      this.advance(onCompleted);
    }
  }

  private advance(onCompleted: () => void): void {
    this.stepIndex += 1;
    if (this.stepIndex >= TUTORIAL_STEPS.length) {
      this.active = false;
      eventBus.emit('tutorial:step', null);
      eventBus.emit('toast:message', {
        title: 'Addestramento Completato!',
        subtitle: 'Ora la vera corsa ha inizio!',
        kind: 'info',
      });
      onCompleted();
    } else {
      this.autoAdvanceTimer = 6.0;
      eventBus.emit('tutorial:step', TUTORIAL_STEPS[this.stepIndex]);
    }
  }

  public stop(): void {
    this.active = false;
    eventBus.emit('tutorial:step', null);
  }
}
