class StockTransactionsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :set_transaction, only: [:destroy]

  def index
    @transactions = @team.stock_transactions
                        .includes(:item, :user)
                        .order(created_at: :desc)
                        .page(params[:page])
                        .per(25)
  end

  def stock_in
    @transaction = @team.stock_transactions.new(transaction_type: :stock_in)
    @items = @team.items.order(:name)
  end

  def stock_out
    @transaction = @team.stock_transactions.new(transaction_type: :stock_out)
    @items = @team.items.order(:name)
  end

  def adjust
    @transaction = @team.stock_transactions.new(transaction_type: :adjust)
    @items = @team.items.order(:name)
  end

  def move
    @transaction = @team.stock_transactions.new(transaction_type: :move)
    @items = @team.items.order(:name)
  end

  def count
    @transaction = @team.stock_transactions.new(transaction_type: :count)
  end

  def create
    @transaction = @team.stock_transactions.new(transaction_params)
    @transaction.user = current_user

    if @transaction.save
      redirect_to team_stock_transactions_path(@team), notice: 'Transaction was successfully created.'
    else
      render action_for_transaction_type, status: :unprocessable_entity
    end
  end

  def destroy
    @transaction.destroy
    redirect_to team_stock_transactions_path(@team), notice: 'Transaction was successfully deleted.'
  end

  private

  def set_team
    @team = current_user.teams.find(params[:team_id])
  end

  def set_transaction
    @transaction = @team.stock_transactions.find(params[:id])
  end

  def transaction_params
    params.require(:stock_transaction).permit(
      :item_id,
      :transaction_type,
      :quantity,
      :source_location,
      :destination_location,
      :notes
    )
  end

  def action_for_transaction_type
    case @transaction.transaction_type
    when 'stock_in' then :stock_in
    when 'stock_out' then :stock_out
    when 'adjust' then :adjust
    when 'move' then :move
    when 'count' then :count
    else :new
    end
  end
end 