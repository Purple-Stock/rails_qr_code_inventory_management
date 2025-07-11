require "test_helper"

class HomeControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    # Sign in a user first since authentication is required
    user = users(:one)
    sign_in user
    get home_index_url
    assert_response :success
  end
end
