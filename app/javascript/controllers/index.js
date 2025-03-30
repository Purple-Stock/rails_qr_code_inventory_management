// Import and register all your controllers from the importmap via controllers/**/*_controller
import { application } from "./application"
import { eagerLoadControllersFrom } from "@hotwired/stimulus-loading"
import FormController from "./form_controller"
import SearchFormController from "./search_form_controller"
eagerLoadControllersFrom("controllers", application)
application.register("form", FormController)
application.register("search-form", SearchFormController)
