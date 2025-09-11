require 'rails_helper'

RSpec.describe 'User sign in', type: :system do
  it 'allows a user to sign in' do
    user = create(:user)

    visit new_user_session_path
    fill_in 'Email', with: user.email
    fill_in 'Password', with: 'password123'
    click_button 'Sign In'

    expect(page).to have_content(I18n.t('teams.selection.title'))
  end
end
