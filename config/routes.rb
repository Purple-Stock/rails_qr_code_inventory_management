Rails.application.routes.draw do
  # Make team selection the root after sign in - this needs to be first
  authenticated :user do
    root "teams#selection", as: :authenticated_root
  end

  # Then define other routes
  get "home/index"
  devise_for :users
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  resources :teams do
    resources :items do
      collection do
        get "search"
        get :find_by_barcode
        get :import
        post :import
        get :export
      end

      member do
        post :duplicate
      end
    end
    resources :labels do
      collection do
        get :new
        post :preview
        post :generate
      end
    end
    resources :stock_transactions, path: "transactions" do
      collection do
        get :stock_in
        post :stock_in
        get :stock_out
        post :stock_out
        get :adjust
        post :adjust
        get :move
        post :move
        get :count
        get :report
        get :stock_by_location
      end
      member do
        delete :destroy
      end
    end
    resources :team_memberships, path: :members, except: [ :show ]
    resource :settings, only: [ :show ]
    resources :locations
    resources :webhooks
  end

  namespace :api do
    namespace :v1 do
      resources :teams, only: [] do
        resources :items, only: [ :index, :show ]
        resources :transactions, only: [ :index, :create ]
      end
    end
  end
  get "team_selection", to: "teams#selection"

  # Default root for non-authenticated users should be last
  root "home#index"
end
