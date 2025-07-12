require 'rails_helper'

RSpec.describe "Webhooks", type: :system do
  include Warden::Test::Helpers

  let(:user) { create(:user) }
  let(:team) { create(:team, user: user) }

  before do
    login_as user, scope: :user
  end

  describe "webhook management" do
    it "allows users to create a new webhook" do
      visit team_webhooks_path(team)

      # Navigate directly to the new webhook page instead of clicking the link
      visit new_team_webhook_path(team)

      fill_in "Url", with: "https://example.com/webhook"
      select "item.created", from: "Event"
      fill_in "Secret", with: "secret123"

      click_button "Create Webhook"

      expect(page).to have_content("Webhook was successfully created")
      expect(page).to have_content("https://example.com/webhook")
      expect(page).to have_content("item.created")
    end

    it "displays validation errors for invalid webhook data" do
      visit new_team_webhook_path(team)

      fill_in "Url", with: "invalid-url"
      # Don't try to fill in Event since it's a select field
      fill_in "Secret", with: ""

      click_button "Create Webhook"

      expect(page).to have_content("error")
      expect(page).to have_content("Url is invalid")
      expect(page).to have_content("Event can't be blank")
    end

    it "allows users to edit an existing webhook" do
      webhook = create(:webhook, team: team)

      visit team_webhooks_path(team)
      click_link "Edit"

      fill_in "Url", with: "https://updated-example.com/webhook"
      select "stock.updated", from: "Event"
      fill_in "Secret", with: "updated_secret"

      click_button "Update Webhook"

      expect(page).to have_content("Webhook was successfully updated")
      expect(page).to have_content("https://updated-example.com/webhook")
      expect(page).to have_content("stock.updated")
    end

    it "allows users to delete a webhook" do
      webhook = create(:webhook, team: team)

      visit team_webhooks_path(team)

      # Handle the confirmation dialog
      accept_confirm do
        click_link "Delete"
      end

      expect(page).to have_content("Webhook was successfully destroyed")
      expect(page).not_to have_content(webhook.url)
    end

    it "displays webhooks in a table format" do
      webhook1 = create(:webhook, :item_created, team: team, url: "https://webhook1.com")
      webhook2 = create(:webhook, :stock_updated, team: team, url: "https://webhook2.com")

      visit team_webhooks_path(team)

      expect(page).to have_content("Webhooks")
      expect(page).to have_content("https://webhook1.com")
      expect(page).to have_content("https://webhook2.com")
      expect(page).to have_content("item.created")
      expect(page).to have_content("stock.updated")
    end

    it "only shows webhooks for the current team" do
      other_team = create(:team)
      team_webhook = create(:webhook, team: team, url: "https://team-webhook.com")
      other_webhook = create(:webhook, team: other_team, url: "https://other-team-webhook.com")

      visit team_webhooks_path(team)

      expect(page).to have_content("https://team-webhook.com")
      expect(page).not_to have_content("https://other-team-webhook.com")
    end
  end

  describe "webhook form validation" do
    it "validates URL format" do
      visit new_team_webhook_path(team)

      fill_in "Url", with: "not-a-url"
      select "item.created", from: "Event"
      fill_in "Secret", with: "secret123"

      click_button "Create Webhook"

      expect(page).to have_content("Url is invalid")
    end

    it "requires URL to be present" do
      visit new_team_webhook_path(team)

      fill_in "Url", with: ""
      select "item.created", from: "Event"
      fill_in "Secret", with: "secret123"

      click_button "Create Webhook"

      expect(page).to have_content("Url can't be blank")
    end

    it "requires event to be present" do
      visit new_team_webhook_path(team)

      fill_in "Url", with: "https://example.com/webhook"
      # Select the blank option to test validation
      select "", from: "Event"
      fill_in "Secret", with: "secret123"

      click_button "Create Webhook"

      expect(page).to have_content("Event can't be blank")
    end

    it "accepts valid URLs" do
      visit new_team_webhook_path(team)

      fill_in "Url", with: "https://api.example.com/webhooks/inventory"
      select "item.created", from: "Event"
      fill_in "Secret", with: "secret123"

      click_button "Create Webhook"

      expect(page).to have_content("Webhook was successfully created")
    end

    it "accepts HTTP URLs" do
      visit new_team_webhook_path(team)

      fill_in "Url", with: "http://localhost:3000/webhook"
      select "item.created", from: "Event"
      fill_in "Secret", with: "secret123"

      click_button "Create Webhook"

      expect(page).to have_content("Webhook was successfully created")
    end
  end

  describe "webhook event types" do
    it "shows available event types in dropdown" do
      visit new_team_webhook_path(team)

      expect(page).to have_select("Event", options: [ "", "item.created", "stock.updated" ])
    end

    it "allows selecting item.created event" do
      visit new_team_webhook_path(team)

      fill_in "Url", with: "https://example.com/webhook"
      select "item.created", from: "Event"
      fill_in "Secret", with: "secret123"

      click_button "Create Webhook"

      expect(page).to have_content("item.created")
    end

    it "allows selecting stock.updated event" do
      visit new_team_webhook_path(team)

      fill_in "Url", with: "https://example.com/webhook"
      select "stock.updated", from: "Event"
      fill_in "Secret", with: "secret123"

      click_button "Create Webhook"

      expect(page).to have_content("stock.updated")
    end
  end

  describe "navigation" do
    it "provides navigation back to webhooks list" do
      visit new_team_webhook_path(team)

      expect(page).to have_link("Back")

      click_link "Back"

      expect(current_path).to eq(team_webhooks_path(team))
    end

    it "provides navigation from edit page" do
      webhook = create(:webhook, team: team)
      visit edit_team_webhook_path(team, webhook)

      expect(page).to have_link("Back")

      click_link "Back"

      expect(current_path).to eq(team_webhooks_path(team))
    end
  end

  describe "webhook integration with settings" do
    it "provides access to webhooks from settings page" do
      visit team_settings_path(team)

      expect(page).to have_link("Webhooks")

      click_link "Webhooks"

      expect(current_path).to eq(team_webhooks_path(team))
    end
  end

  describe "webhook security" do
    it "allows setting a secret for webhook authentication" do
      visit new_team_webhook_path(team)

      fill_in "Url", with: "https://example.com/webhook"
      select "item.created", from: "Event"
      fill_in "Secret", with: "very_secure_secret_key_123"

      click_button "Create Webhook"

      expect(page).to have_content("Webhook was successfully created")
      expect(Webhook.last.secret).to eq("very_secure_secret_key_123")
    end
  end
end
