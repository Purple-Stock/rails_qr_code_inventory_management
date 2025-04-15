class LocationsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :set_location, only: [:show, :edit, :update, :destroy]
  
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
      redirect_to team_locations_path(@team), notice: 'Location was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end
  
  def edit
  end
  
  def update
    if @location.update(location_params)
      redirect_to team_locations_path(@team), notice: 'Location was successfully updated.'
    else
      render :edit, status: :unprocessable_entity
    end
  end
  
  def destroy
    if @location.items_as_source.exists? || @location.items_as_destination.exists?
      redirect_to team_locations_path(@team), alert: 'Cannot delete location that has associated transactions.'
    else
      @location.destroy
      redirect_to team_locations_path(@team), notice: 'Location was successfully deleted.'
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