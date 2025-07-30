require 'rails_helper'

RSpec.describe "Infinite Scroll", type: :system do
  let(:user) { create(:user) }
  let(:team) { create(:team, user: user) }
  let(:location) { create(:location, team: team) }

  before do
    # Create enough items to trigger infinite scroll
    create_list(:item, 25, team: team, location: location)
    
    # Sign in through the UI
    visit new_user_session_path
    fill_in 'E-mail', with: user.email
    fill_in 'Senha', with: 'password123'
    click_button 'Entrar'
    
    # Select the team
    click_link team.name if page.has_content?(team.name)
  end

  it "loads more items when scrolling to bottom", js: true do
    visit team_items_path(team)
    
    # Wait for page to load
    expect(page).to have_content("Items")
    
    # Should initially show 20 items (default per_page)
    expect(page).to have_css('[data-infinite-scroll-item]', count: 20)
    
    # Scroll to bottom to trigger infinite scroll
    page.execute_script("window.scrollTo(0, document.body.scrollHeight)")
    
    # Wait for more items to load
    expect(page).to have_css('[data-infinite-scroll-item]', count: 25, wait: 5)
  end

  it "shows loading indicator while loading more items", js: true do
    visit team_items_path(team)
    
    # Scroll to bottom
    page.execute_script("window.scrollTo(0, document.body.scrollHeight)")
    
    # Should show loading indicator
    expect(page).to have_css('.infinite-scroll-loading', visible: true, wait: 2)
  end

  it "shows end message when all items are loaded", js: true do
    visit team_items_path(team)
    
    # Scroll to bottom to load all items
    page.execute_script("window.scrollTo(0, document.body.scrollHeight)")
    
    # Wait for all items to load
    expect(page).to have_css('[data-infinite-scroll-item]', count: 25, wait: 5)
    
    # Should show end message
    expect(page).to have_css('.infinite-scroll-end-message', visible: true, wait: 2)
    expect(page).to have_content("All items loaded")
  end
end