import { Controller } from "@hotwired/stimulus"
import Chart from "chart.js/auto"

export default class extends Controller {
  connect() {
    const config = JSON.parse(this.element.dataset.chart)
    new Chart(this.element.getContext('2d'), config)
  }
}
