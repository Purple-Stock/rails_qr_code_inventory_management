class Api::V1::TransactionsController < Api::V1::BaseController
  before_action :set_team
  before_action -> { require_role!(@team, :editor) }, only: [ :create ]

  def index
    render json: @team.stock_transactions
  end

  def create
    transaction = @team.stock_transactions.new(transaction_params.merge(user: current_user))
    if transaction.save
      render json: transaction, status: :created
    else
      render json: { errors: transaction.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_team
    @team = current_user.teams.find(params[:team_id])
  end

  def transaction_params
    params.require(:transaction).permit(:item_id, :quantity, :transaction_type, :source_location_id, :destination_location_id, :notes)
  end
end
