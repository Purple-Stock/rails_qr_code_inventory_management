class LabelsController < ApplicationController
  before_action :set_team

  def new
    @items = @team.items # Now scoped to team
  end

  def preview
    @selected_items = @team.items.where(id: params[:item_ids])
    @label_type = params[:label_type]
    @layout = params[:layout]

    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: turbo_stream.update("preview",
          partial: "labels/preview",
          locals: { selected_items: @selected_items, label_type: @label_type }
        )
      end
      format.html do
        render partial: "labels/preview", locals: { selected_items: @selected_items, label_type: @label_type }
      end
    end
  end

  def generate
    item_ids = params[:item_ids].to_s.split(",").reject(&:empty?)
    copies = params[:copies].to_s.split(",").reject(&:empty?).map(&:to_i)

    # Create a hash of item_id => copies
    item_copies = {}
    item_ids.each_with_index do |item_id, index|
      item_copies[item_id] = copies[index] || 1 # Default to 1 copy if not specified
    end

    @selected_items = @team.items.where(id: item_ids)

    if @selected_items.empty?
      flash[:error] = "Please select at least one item"
      redirect_to new_team_label_path(@team) and return
    end

    if @selected_items.any? { |item| item.sku.blank? }
      flash[:error] = "All selected items must have SKUs"
      redirect_to new_team_label_path(@team) and return
    end

    @label_type = params[:label_type].presence || "barcode" # Default to barcode if not specified
    @layout = params[:layout]

    respond_to do |format|
      format.html { redirect_to new_team_label_path(@team) }
      format.pdf do
        pdf = LabelPdfGenerator.new(@selected_items, @label_type, @layout, item_copies).generate
        send_data pdf.render,
          filename: "labels-#{Time.current.to_i}.pdf",
          type: "application/pdf",
          disposition: "attachment"
      end
    end
  rescue => e
    Rails.logger.error "PDF generation failed: #{e.message}"
    flash[:error] = "Failed to generate PDF. Please try again."
    redirect_to new_team_label_path(@team)
  end

  private

  def set_team
    @team = Team.find(params[:team_id])
  end
end
