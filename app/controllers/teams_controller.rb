class TeamsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team, only: [ :show, :edit, :update, :destroy ]
  before_action -> { require_role!(@team, :admin) }, only: [ :edit, :update, :destroy ]

  def selection
    @teams = current_user.teams
  end

  def index
    @teams = current_user.teams
  end

  def show
  end

  def new
    @team = Team.new(user: current_user)
    @hide_team_settings = true
  end

  def create
    @team = Team.new(team_params.merge(user: current_user))
    @hide_team_settings = true

    if @team.save
      redirect_to team_selection_path, notice: "Time criado com sucesso."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
    @hide_team_settings = true
  end

  def update
    @hide_team_settings = true
    if @team.update(team_params)
      redirect_to team_selection_path, notice: "Time atualizado com sucesso."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @team.destroy
    redirect_to team_selection_path, notice: "Time removido com sucesso."
  end

  private

  def set_team
    @team = current_user.teams.find(params[:id])
  end

  def team_params
    params.require(:team).permit(:name, :notes)
  end
end
