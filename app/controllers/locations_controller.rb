class LocationsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :set_location, only: [ :show, :edit, :update, :destroy ]
  before_action -> { require_role!(@team, :editor) }, only: [ :new, :create, :edit, :update, :destroy ]

  def index
    @locations = @team.locations.ordered
  end

  def show
  end

  def new
    @location = @team.locations.build
  end

  def create
    @location = @team.locations.build(location_params)

    if @location.save
      redirect_to team_locations_path(@team), notice: "Location was successfully created."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @location.update(location_params)
      redirect_to team_locations_path(@team), notice: "Location was successfully updated."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @location = @team.locations.find(params[:id])

    if @location.items.exists?
      redirect_to team_locations_path(@team),
                  alert: t("locations.destroy.error_has_items",
                          count: @location.items.count)
    else
      if @location.destroy
        redirect_to team_locations_path(@team),
                    notice: t("locations.destroy.success")
      else
        redirect_to team_locations_path(@team),
                    alert: t("locations.destroy.error")
      end
    end
  end

  private

  def set_team
    @team = current_user.teams.find(params[:team_id])
  end

  def set_location
    @location = @team.locations.find(params[:id])
  end

  def location_params
    params.require(:location).permit(:name, :description)
  end
end
