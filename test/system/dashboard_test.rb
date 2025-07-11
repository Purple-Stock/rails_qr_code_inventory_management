require "application_system_test_case"

class DashboardTest < ApplicationSystemTestCase
  setup do
    @user = users(:one)
    sign_in @user
    @team = Team.create!(name: "Test Team", user: @user)
  end

  test "visiting dashboard" do
    visit dashboard_team_path(@team)
    assert_selector "h1", text: I18n.t('dashboard.title')
  end
end
