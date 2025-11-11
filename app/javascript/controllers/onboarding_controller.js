import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["step", "overlay", "container", "restartButton"]
  static values = {
    storageKey: { type: String, default: "team_selection_onboarding_completed" },
    currentStep: { type: Number, default: 0 },
    itemsEmpty: { type: Boolean, default: false },
    listEmpty: { type: Boolean, default: false },
    newItemUrl: { type: String, default: "" }
  }

  connect() {
    // Adiciona listener para redimensionamento da janela
    this.handleResize = this.handleResize.bind(this)
    window.addEventListener("resize", this.handleResize)

    this.toggleEmptySteps()

    // Mostra o botão de revisar tutorial se o onboarding já foi completado
    if (this.isCompleted()) {
      this.showRestartButton()
      return
    }

    // Inicia o onboarding após um pequeno delay para garantir que o DOM está pronto
    setTimeout(() => {
      this.start()
    }, 500)
  }

  disconnect() {
    window.removeEventListener("resize", this.handleResize)
    this.cleanup()
  }

  handleResize() {
    // Reposiciona o tooltip quando a janela é redimensionada
    // Filtra apenas os steps visíveis (não escondidos)
    const visibleSteps = this.stepTargets.filter(step => step.style.display !== "none")
    const currentStep = visibleSteps[this.currentStepValue]
    if (currentStep && !currentStep.classList.contains("hidden")) {
      const targetSelector = currentStep.dataset.onboardingTargetSelector
      if (targetSelector) {
        const targetElement = document.querySelector(targetSelector)
        if (targetElement) {
          const rect = targetElement.getBoundingClientRect()
          const tooltip = currentStep.querySelector("[data-onboarding-tooltip]")
          if (tooltip) {
            this.positionTooltip(tooltip, rect)
          }
          this.updateOverlay()
        }
      }
    }
  }


  start() {
    this.currentStepValue = 0
    this.showStep(0)
  }

  next() {
    // Filtra apenas os steps visíveis (não escondidos)
    const visibleSteps = this.stepTargets.filter(step => step.style.display !== "none")
    
    if (this.currentStepValue < visibleSteps.length - 1) {
      this.currentStepValue++
      this.showStep(this.currentStepValue)
    } else {
      this.complete()
    }
  }

  previous() {
    if (this.currentStepValue > 0) {
      this.currentStepValue--
      this.showStep(this.currentStepValue)
    }
  }

  skip() {
    this.complete()
  }

  showStep(stepIndex) {
    // Mostra o container e overlay se estiverem escondidos
    this.containerTarget.classList.remove("hidden")
    this.overlayTarget.classList.remove("hidden")
    
    // Filtra apenas os steps visíveis (não escondidos)
    const visibleSteps = this.stepTargets.filter(step => step.style.display !== "none")
    
    // Esconde todos os steps
    this.stepTargets.forEach((step, index) => {
      // Encontra o índice do step no array de steps visíveis
      const visibleIndex = visibleSteps.indexOf(step)
      
      if (visibleIndex === stepIndex && visibleIndex !== -1) {
        step.classList.remove("hidden")
        this.highlightElement(step)
      } else {
        step.classList.add("hidden")
      }
    })

    // Atualiza o overlay após um pequeno delay para garantir que o DOM foi atualizado
    setTimeout(() => {
      this.updateOverlay()
    }, 100)
  }

  highlightElement(stepElement) {
    const targetSelector = stepElement.dataset.onboardingTargetSelector
    if (!targetSelector) return

    // Remove highlight de elementos anteriores
    document.querySelectorAll(".onboarding-highlight").forEach(el => {
      el.classList.remove("onboarding-highlight")
    })

    const targetElement = document.querySelector(targetSelector)
    if (!targetElement) return

    // Adiciona classe de highlight ao elemento alvo
    targetElement.classList.add("onboarding-highlight")
    
    // Calcula posição para o tooltip após um pequeno delay
    setTimeout(() => {
      const rect = targetElement.getBoundingClientRect()
      const tooltip = stepElement.querySelector("[data-onboarding-tooltip]")
      
      if (tooltip) {
        // Posiciona o tooltip
        this.positionTooltip(tooltip, rect)
      }
    }, 50)
  }

  positionTooltip(tooltip, targetRect) {
    // Força o tooltip a ser renderizado para calcular suas dimensões
    tooltip.style.visibility = "hidden"
    tooltip.style.display = "block"
    tooltip.style.position = "fixed"
    tooltip.style.zIndex = "9999"
    
    const tooltipRect = tooltip.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const padding = 20

    // Posição padrão: abaixo do elemento, centralizado
    let top = targetRect.bottom + padding
    let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)

    // Ajusta horizontalmente se sair da tela
    if (left < padding) {
      left = padding
    }
    if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding
    }

    // Se não couber abaixo, tenta colocar acima
    if (top + tooltipRect.height > viewportHeight - padding) {
      top = targetRect.top - tooltipRect.height - padding
      // Se também não couber acima, centraliza verticalmente
      if (top < padding) {
        top = (viewportHeight - tooltipRect.height) / 2
      }
    }

    tooltip.style.top = `${Math.max(padding, top)}px`
    tooltip.style.left = `${Math.max(padding, left)}px`
    tooltip.style.visibility = "visible"
  }

  updateOverlay() {
    // Filtra apenas os steps visíveis (não escondidos)
    const visibleSteps = this.stepTargets.filter(step => step.style.display !== "none")
    const currentStep = visibleSteps[this.currentStepValue]
    if (!currentStep) return

    const targetSelector = currentStep.dataset.onboardingTargetSelector
    if (!targetSelector) return

    const targetElement = document.querySelector(targetSelector)
    if (!targetElement) return

    const rect = targetElement.getBoundingClientRect()
    const overlay = this.overlayTarget

    // Cria um "buraco" no overlay para destacar o elemento
    // Usa inset para criar um retângulo vazio no meio
    const padding = 8 // padding ao redor do elemento destacado
    overlay.style.clipPath = `polygon(
      0% 0%,
      0% 100%,
      ${rect.left - padding}px 100%,
      ${rect.left - padding}px ${rect.top - padding}px,
      ${rect.right + padding}px ${rect.top - padding}px,
      ${rect.right + padding}px ${rect.bottom + padding}px,
      ${rect.left - padding}px ${rect.bottom + padding}px,
      ${rect.left - padding}px 100%,
      100% 100%,
      100% 0%
    )`
  }

  complete() {
    // Marca como completado no localStorage
    localStorage.setItem(this.storageKeyValue, "true")
    
    // Remove highlights
    document.querySelectorAll(".onboarding-highlight").forEach(el => {
      el.classList.remove("onboarding-highlight")
    })

    // Esconde o container e overlay do onboarding
    this.containerTarget.classList.add("hidden")
    this.overlayTarget.classList.add("hidden")
    
    // Mostra o botão de revisar tutorial
    this.showRestartButton()
    
    this.cleanup()
  }

  showRestartButton() {
    if (this.hasRestartButtonTarget) {
      this.restartButtonTarget.classList.remove("hidden")
    }
  }

  hideRestartButton() {
    if (this.hasRestartButtonTarget) {
      this.restartButtonTarget.classList.add("hidden")
    }
  }

  cleanup() {
    document.querySelectorAll(".onboarding-highlight").forEach(el => {
      el.classList.remove("onboarding-highlight")
    })
  }

  toggleEmptySteps() {
    const isEmpty = (this.hasListEmptyValue && this.listEmptyValue === true) || this.itemsEmptyValue === true

    this.stepTargets.forEach(step => {
      if (step.dataset.onboardingHideWhenEmptyValue === "true") {
        step.style.display = isEmpty ? "none" : ""
      }
    })
  }

  isCompleted() {
    return localStorage.getItem(this.storageKeyValue) === "true"
  }

  restart() {
    // Remove o flag de completado do localStorage
    localStorage.removeItem(this.storageKeyValue)
    
    // Esconde o botão de revisar tutorial
    this.hideRestartButton()
    
    // Reinicia o onboarding
    this.currentStepValue = 0
    this.start()
  }
}

