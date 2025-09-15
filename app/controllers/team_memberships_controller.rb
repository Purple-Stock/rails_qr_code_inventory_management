class TeamMembershipsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action -> { require_role!(@team, :admin) }
  before_action :set_membership, only: [ :edit, :update, :destroy ]

  def index
    @memberships = @team.team_memberships.includes(:user).order("role DESC")
  end

  def new
    @membership = @team.team_memberships.new
  end

  def create
    email = membership_params.delete(:email).to_s.downcase.strip
    user = User.find_by(email: email)
    unless user
      redirect_to team_team_memberships_path(@team), alert: "Usuário não encontrado: #{email}" and return
    end

    @membership = @team.team_memberships.new(user: user, role: membership_params[:role])
    if @membership.save
      redirect_to team_team_memberships_path(@team), notice: "Membro adicionado com sucesso."
    else
      redirect_to team_team_memberships_path(@team), alert: @membership.errors.full_messages.to_sentence
    end
  end

  def edit; end

  def update
    if @membership.update(membership_params.except(:email))
      redirect_to team_team_memberships_path(@team), notice: "Permissões atualizadas."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    if @membership.role == "owner"
      redirect_to team_team_memberships_path(@team), alert: "Não é possível remover o proprietário." and return
    end
    @membership.destroy
    redirect_to team_team_memberships_path(@team), notice: "Membro removido."
  end

  private

  def set_team
    @team = current_user.teams.find(params[:team_id])
  end

  def set_membership
    @membership = @team.team_memberships.find(params[:id])
  end

  def membership_params
    params.require(:team_membership).permit(:email, :role)
  end
end
